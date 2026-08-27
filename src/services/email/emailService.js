/*
|--------------------------------------------------------------------------
| Email Service
|--------------------------------------------------------------------------
| The one door out of the app for anything that has to reach an inbox.
|
| Behind that door is a Google Apps Script web app (see `apps-script/`). The
| browser never composes an email and never holds a provider key: it names a
| template the script knows and hands over the recipients to fill it with.
| The script writes every recipient into a Google Sheet first and only then
| sends the mail from the company's own Google account.
|
| The sheet is as much the point as the sending. It is the standing record of
| who was invited, when, with which link, and whether it actually left —
| readable by anybody in HR without opening this app.
|
| Nothing here throws. Sending an invitation is something a screen does after
| the work that mattered has already succeeded, and a mail server having a
| bad afternoon must not read to the user as the onboarding having failed.
| Every call comes back as `{ success, message }` for the caller to show.
|
| Configuration (.env):
|   VITE_EMAIL_SERVICE_URL  the deployed web app, the URL ending in /exec
|   VITE_EMAIL_SERVICE_KEY  optional, matching the script's API_KEY
|--------------------------------------------------------------------------
*/

const SERVICE_URL = (import.meta.env.VITE_EMAIL_SERVICE_URL || "").trim();

const SERVICE_KEY = (import.meta.env.VITE_EMAIL_SERVICE_KEY || "").trim();

/*
| The templates the script can render. Kept as names rather than typed out at
| the call sites so a rename is caught here instead of silently sending
| nothing.
*/
export const EMAIL_TEMPLATES = {
    ONBOARDING_INVITATION: "onboarding-invitation",
};

/*
| How many recipients travel in one request. Apps Script stops a run at six
| minutes and a send costs the better part of a second, so a batch is kept
| well inside that ceiling; a longer list simply becomes several requests and
| the caller never has to think about it.
*/
const MAX_MESSAGES_PER_REQUEST = 50;

const NOT_CONFIGURED =
    "Email sending is not set up yet. Ask your administrator to configure VITE_EMAIL_SERVICE_URL.";

export const isEmailServiceConfigured = () => Boolean(SERVICE_URL);

/*
| Apps Script hands out two URLs for the same project and they look alike
| enough to be copied in place of one another:
|
|   /macros/s/<deployment>/exec        the web app — what we want
|   /macros/library/d/<script>/<n>     the library id, not an endpoint at all
|
| The library one answers no request and sends no CORS header, so pasting it
| into .env surfaces in the console as "No 'Access-Control-Allow-Origin'
| header" — a message that says nothing about the actual mistake. Catching
| the shape here costs one comparison and saves that hunt. `/dev` is allowed
| too: it is the test deployment, usable while signed in as the owner.
*/
const wrongUrlShape = () => {

    if (/\/(exec|dev)\/?$/.test(SERVICE_URL)) {
        return "";
    }

    if (SERVICE_URL.includes("/macros/library/")) {
        return "VITE_EMAIL_SERVICE_URL is the Apps Script *library* URL, which cannot receive requests. Use the Web app URL ending in /exec instead.";
    }

    return "VITE_EMAIL_SERVICE_URL does not look like an Apps Script web app. It should end in /exec.";
};

/*
| One request, one place. Every network and parsing failure is turned into
| the same `{ success: false, message }` the script returns on purpose, so a
| caller has one shape to read rather than a response, an exception and a
| Google error page.
*/
const post = async (payload) => {

    if (!isEmailServiceConfigured()) {
        return {
            success: false,
            message: NOT_CONFIGURED,
        };
    }

    const misconfigured = wrongUrlShape();

    if (misconfigured) {
        return {
            success: false,
            message: misconfigured,
        };
    }

    try {

        const response = await fetch(SERVICE_URL, {
            method: "POST",
            /*
            | `text/plain` and no custom headers, deliberately. An Apps Script
            | web app answers no OPTIONS preflight, so anything the browser
            | treats as a non-simple request — an `application/json` content
            | type or an `X-Api-Key` header included — is refused before it
            | ever leaves. The script parses the body as JSON regardless, and
            | the shared key rides inside it.
            */
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            redirect: "follow",
            body: JSON.stringify({
                ...payload,
                key: SERVICE_KEY,
            }),
        });

        const body = await response.text();

        let result = null;

        try {
            result = JSON.parse(body);
        } catch {
            result = null;
        }

        if (!result) {
            return {
                success: false,
                message: `The email service returned an unreadable response (${response.status}). Check that the Apps Script web app is deployed with access set to "Anyone".`,
            };
        }

        return result;

    } catch (error) {

        /*
        | `fetch` throws the same TypeError for a dead network and for a
        | response the browser refused to hand over, so the two cannot be
        | told apart here. Far and away the usual cause is the second one:
        | a web app deployed to anything other than "Anyone" bounces the
        | request to accounts.google.com, which sends back no CORS header.
        | The message names that first because it is what is nearly always
        | actually wrong.
        */
        console.error("Email service unreachable:", error);

        return {
            success: false,
            message:
                'Could not reach the email service. Check that the Apps Script web app is deployed with "Who has access" set to Anyone, and that your connection is working.',
        };

    }
};

/*
|--------------------------------------------------------------------------
| Send Many
|--------------------------------------------------------------------------
| `messages` is `[{ ref, to, data }]`. The `ref` is echoed back untouched on
| every result, which is how a caller matches an outcome to the row it came
| from without relying on the order surviving the round trip.
|
| Longer runs are cut into requests the script will finish comfortably and
| the outcomes stitched back into one list.
*/

export const sendBulkEmails = async ({ template, messages = [], replyTo }) => {

    const recipients = messages.filter((item) => item?.to);

    const missing = messages
        .filter((item) => !item?.to)
        .map((item) => ({
            ref: item?.ref || "",
            to: "",
            success: false,
            message: "No email address on record for this employee.",
        }));

    if (!recipients.length) {
        return {
            success: false,
            sent: 0,
            failed: missing.length,
            results: missing,
            message: missing.length
                ? "None of these employees has an email address on record."
                : "There is nobody to send to.",
        };
    }

    const results = [...missing];

    let message = "";

    for (
        let index = 0;
        index < recipients.length;
        index += MAX_MESSAGES_PER_REQUEST
    ) {

        const chunk = recipients.slice(index, index + MAX_MESSAGES_PER_REQUEST);

        const outcome = await post({
            template,
            replyTo,
            messages: chunk,
        });

        if (Array.isArray(outcome.results)) {

            results.push(...outcome.results);

        } else {

            /* The whole request was refused, so every row in it failed. */
            message = outcome.message || message;

            chunk.forEach((item) =>
                results.push({
                    ref: item.ref || "",
                    to: item.to,
                    success: false,
                    message: outcome.message || "The email service failed.",
                })
            );

        }
    }

    const sent = results.filter((item) => item.success).length;

    return {
        success: sent > 0,
        sent,
        failed: results.length - sent,
        results,
        message,
    };
};

/*
|--------------------------------------------------------------------------
| Send One
|--------------------------------------------------------------------------
| A single send is a batch of one rather than a second endpoint. That keeps
| one path through the script — one sheet row written the same way, one set
| of rules about what a failure means — so a one-off invitation and a bulk
| run can never quietly diverge.
*/

export const sendEmail = async ({ template, to, data, replyTo }) => {

    if (!to) {
        return {
            success: false,
            message: "No email address on record for this recipient.",
        };
    }

    const outcome = await sendBulkEmails({
        template,
        replyTo,
        messages: [{ ref: "", to, data }],
    });

    const row = outcome.results?.[0];

    return {
        success: Boolean(row?.success),
        message:
            row?.message ||
            outcome.message ||
            "The email could not be sent.",
    };
};
