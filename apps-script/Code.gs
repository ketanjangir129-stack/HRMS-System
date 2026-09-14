    /*
    |--------------------------------------------------------------------------
    | HRMS Email Service — Google Apps Script Web App
    |--------------------------------------------------------------------------
    | Everything the HRMS sends to an inbox comes through here. The browser posts
    | a template name and the people to send it to; this script writes every one
    | of them into a Google Sheet and then sends the mail from the Google account
    | that owns the script.
    |
    | The sheet is written BEFORE anything is sent, and on purpose. Apps Script
    | stops a run at six minutes; if a long batch is cut off half way, the record
    | of who was in it — and their invitation links — is already safe on the
    | sheet, and the rows still marked "Pending" are exactly the ones to chase.
    |
    | Deploying and configuring this is described in README.md next to this file.
    |
    | Routes:
    |   GET   ?           — health check, says whether the sheet can be reached
    |   POST  (JSON body) — { template, replyTo, key, messages: [{ref, to, data}] }
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    | The four lines anybody setting this up has to touch. Everything below them
    | is machinery.
    */

    /* The spreadsheet to log into. Leave blank to use the one this script is
    bound to (Extensions ▸ Apps Script from inside a sheet). */
    const SPREADSHEET_ID = "";

    /* The tab within it — every template is logged to this one tab, with an
    "Email Type" column to tell them apart. Created with its headings if it
    does not exist yet. */
    const SHEET_NAME = "Invitations";

    /* Shared secret. Leave blank to accept any caller; set it to match the
    front end's VITE_EMAIL_SERVICE_KEY to lock the web app to this app. */
    const API_KEY = "";

    /* The name recipients see the mail come from. The address is always the
    Google account running this script — that cannot be changed here. */
    const SENDER_NAME = "HR Team";

    /* A ceiling on one request, so a runaway caller cannot spend the whole
    day's mail quota in a single POST. The front end batches to fit. */
    const MAX_MESSAGES = 100;

    /*
    |--------------------------------------------------------------------------
    | The sheet
    |--------------------------------------------------------------------------
    */

    const HEADINGS = [
        "Logged At",
        "Company Code",
        "Company",
        "Employee ID",
        "Name",
        "Email",
        "Designation",
        "Department",
        "Joining Date",
        "Link",
        "Status",
        "Message",
        "Email Type",
    ];

    /* The first of the two columns the send writes back into. */
    const STATUS_COLUMN = 11;

    /*
    | The tab, made if it is missing. A first run against a brand new spreadsheet
    | should just work rather than fail on a name nobody was told to create.
    */
    function getSheet_() {

        var book = SPREADSHEET_ID
            ? SpreadsheetApp.openById(SPREADSHEET_ID)
            : SpreadsheetApp.getActiveSpreadsheet();

        if (!book) {
            throw new Error(
                "No spreadsheet to log into. Set SPREADSHEET_ID at the top of Code.gs."
            );
        }

        var sheet = book.getSheetByName(SHEET_NAME);

        if (!sheet) {
            sheet = book.insertSheet(SHEET_NAME);
        }

        ensureHeadings_(sheet);

        return sheet;
    }

    /*
    | The heading row: written on a fresh tab, and brought up to date on one that
    | was started by an older version of this file.
    |
    | Columns here are only ever renamed or added on the end, never reordered.
    | That is what makes rewriting the row safe — no heading can end up sitting
    | over a column of somebody else's data.
    */
    function ensureHeadings_(sheet) {

        if (sheet.getMaxColumns() < HEADINGS.length) {
            sheet.insertColumnsAfter(
                sheet.getMaxColumns(),
                HEADINGS.length - sheet.getMaxColumns()
            );
        }

        var range = sheet.getRange(1, 1, 1, HEADINGS.length);

        if (sheet.getLastRow() === 0) {

            range.setValues([HEADINGS]).setFontWeight("bold");

            sheet.setFrozenRows(1);

            return;
        }

        var current = range.getValues()[0];

        for (var index = 0; index < HEADINGS.length; index += 1) {

            if (String(current[index]) !== HEADINGS[index]) {
                range.setValues([HEADINGS]).setFontWeight("bold");
                return;
            }
        }
    }

    /*
    | One recipient, one row, in the order the headings promise. Every template
    | lands in the same tab so that one filter — by company, by employee, by
    | email type — answers "what has this person been sent".
    |
    | The link is written as plain text so a sheet full of them stays copyable
    | rather than turning into two hundred chips.
    */
    function toSheetRow_(template, message) {

        var data = message.data || {};

        return [
            new Date(),
            data.companyCode || "",
            data.companyName || "",
            data.employeeId || "",
            data.name || "",
            message.to || "",
            data.designation || "",
            data.department || "",
            data.joiningDate || "",
            actionLink_(data),
            "Pending",
            "",
            templateLabel_(template),
        ];
    }

    /*
    | Every template is built around one link the recipient is meant to follow,
    | and it is that link the sheet logs — whichever of them this email carried.
    |
    | With one deliberate exception: `resetLink` is NOT listed here and must not
    | be added. A password reset link is a credential — anybody holding it can
    | set that account's password — and the sheet is shared with everybody in
    | HR. The row still records that a reset was sent, to whom and when, which
    | is what an audit trail is for; the link itself stays in the recipient's
    | inbox, where it belongs.
    */
    function actionLink_(data) {
        return (
            data.invitationLink ||
            data.equipmentLink ||
            data.certificateLink ||
            data.loginLink ||
            ""
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Sending
    |--------------------------------------------------------------------------
    | Log everything, then send one at a time, then write back what happened to
    | each. A single bad address fails its own row and nothing else: a batch of
    | two hundred that contains two typos is a hundred and ninety eight
    | invitations delivered, not a failed run.
    */

    function sendAll_(template, messages, replyTo) {

        var sheet = getSheet_();

        var firstRow = sheet.getLastRow() + 1;

        sheet
            .getRange(firstRow, 1, messages.length, HEADINGS.length)
            .setValues(
                messages.map(function (message) {
                    return toSheetRow_(template, message);
                })
            );

        /* Get the rows onto the sheet before a single send is attempted. */
        SpreadsheetApp.flush();

        var quota = MailApp.getRemainingDailyQuota();

        var results = [];
        var statuses = [];

        for (var index = 0; index < messages.length; index += 1) {

            var message = messages[index];

            var outcome = sendOne_(template, message, replyTo, quota);

            if (outcome.success) {
                quota -= 1;
            }

            results.push({
                ref: message.ref || "",
                to: message.to || "",
                success: outcome.success,
                message: outcome.message,
            });

            statuses.push([outcome.success ? "Sent" : "Failed", outcome.message]);
        }

        sheet
            .getRange(firstRow, STATUS_COLUMN, statuses.length, 2)
            .setValues(statuses);

        var sent = results.filter(function (item) {
            return item.success;
        }).length;

        return {
            success: sent > 0,
            sent: sent,
            failed: results.length - sent,
            results: results,
            message: "",
        };
    }

    function sendOne_(template, message, replyTo, quota) {

        if (!isEmail_(message.to)) {
            return {
                success: false,
                message: "A valid recipient email address is required.",
            };
        }

        var rendered = renderTemplate_(template, message.data || {});

        if (!rendered) {
            return {
                success: false,
                message: 'Unknown email template "' + template + '".',
            };
        }

        if (quota <= 0) {
            return {
                success: false,
                message:
                    "This Google account has no sending quota left today. Try again tomorrow.",
            };
        }

        var options = {
            to: String(message.to).trim(),
            subject: rendered.subject,
            htmlBody: rendered.html,
            body: rendered.text,
            name: SENDER_NAME,
        };

        var reply = message.replyTo || replyTo;

        if (isEmail_(reply)) {
            options.replyTo = String(reply).trim();
        }

        try {

            MailApp.sendEmail(options);

            return { success: true, message: templateLabel_(template) + " emailed." };

        } catch (error) {

            return {
                success: false,
                message: error && error.message ? error.message : "The send failed.",
            };

        }
    }

    /*
    |--------------------------------------------------------------------------
    | Templates
    |--------------------------------------------------------------------------
    | The caller names a template and hands over the data for it; it never sends
    | subject and HTML of its own. That is deliberate — an endpoint that accepted
    | a body from the browser would be an open mail relay for anybody who read
    | the app's bundle.
    |
    | A template here is only a description of an email — a heading, a few
    | paragraphs, cards of label/value rows, and the one link the message exists
    | for. `message_` below turns that description into the HTML and the plain
    | text together. That is what makes two emails from this file look like they
    | came from the same company: neither one owns any layout, and a third is a
    | dozen lines of wording rather than another copy of the frame.
    |
    | A new email is a function here and an entry in TEMPLATES.
    */

    var TEMPLATES = {

        "onboarding-invitation": {
            label: "Onboarding invitation",
            render: onboardingInvitation_,
        },

        "onboarding-approved": {
            label: "Onboarding approval",
            render: onboardingApproved_,
        },

        "password-reset": {
            label: "Password reset",
            render: passwordReset_,
        },

        "equipment-submission": {
            label: "Equipment submission",
            render: equipmentSubmission_,
        },

        "exit-noc": {
            label: "No Objection Certificate",
            render: exitNoc_,
        },
    };

    /*
    | Looked up as an own property, so a `template` of "constructor" or
    | "toString" coming in off the wire finds nothing rather than something
    | inherited from Object.
    */
    function template_(name) {

        var key = String(name === null || name === undefined ? "" : name);

        return Object.prototype.hasOwnProperty.call(TEMPLATES, key)
            ? TEMPLATES[key]
            : null;
    }

    function renderTemplate_(name, data) {

        var found = template_(name);

        return found ? found.render(data || {}) : null;
    }

    /* What the sheet and the per-row results call this email. */
    function templateLabel_(name) {

        var found = template_(name);

        return found ? found.label : "Email";
    }

    /*
    |--------------------------------------------------------------------------
    | The onboarding invitation
    |--------------------------------------------------------------------------
    | Sent when HR creates the invitation link, one at a time or by the
    | hundred. The link is the whole point of the message, so `message_` prints
    | it twice: as the button, and as text beneath it for the clients that strip
    | buttons.
    */
    function onboardingInvitation_(data) {

        var companyName = data.companyName || "Your Company";

        return message_({
            companyName: companyName,

            subject: "Complete your onboarding with " + companyName,

            preheader:
                "Your onboarding form for " + companyName + " is ready to fill in.",

            heading: "Welcome aboard, " + (data.name || "there") + "!",

            intro: [
                "We are delighted to have you joining " + companyName + ". " +
                "To get your paperwork out of the way before day one, please " +
                "complete your onboarding form using the link below.",
            ],

            cards: [
                {
                    rows: employmentRows_(data),
                },
            ],

            action: {
                label: "Complete Your Onboarding",
                href: data.invitationLink || "",
            },

            closing: [
                "Keep your identity, bank and education documents handy — the " +
                "form asks for them. Once you submit it, our HR team reviews the " +
                "details and confirms your onboarding.",
            ],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | The onboarding approval
    |--------------------------------------------------------------------------
    | Sent when HR approves the form the joiner submitted. It is the first mail
    | that is of any use after joining, so it carries the sign-in details rather
    | than only the good news: the company code, the user id, and — while the
    | account is still on the one it was created with — the temporary password.
    |
    | The password row is dropped when the caller does not send one, which is
    | how an approval that is re-sent to somebody who has since chosen their own
    | password avoids printing a password that no longer works.
    */
    function onboardingApproved_(data) {

        var companyName = data.companyName || "Your Company";

        return message_({
            companyName: companyName,

            subject: "Your onboarding at " + companyName + " is approved",

            preheader:
                "Your onboarding has been approved — here is how to sign in.",

            heading: "You are all set, " + (data.name || "there") + "!",

            intro: [
                "Our HR team has reviewed and approved the details you submitted, " +
                "and your employee record at " + companyName + " is now active.",
            ],

            cards: [
                {
                    title: "Your employment details",
                    rows: employmentRows_(data),
                },
                {
                    title: "Signing in",
                    rows: [
                        { label: "Company Code", value: data.companyCode },
                        { label: "User ID", value: data.username || data.employeeId },
                        { label: "Temporary Password", value: data.temporaryPassword },
                    ],
                },
            ],

            action: {
                label: "Sign In to Your Account",
                href: data.loginLink || "",
            },

            closing: [
                data.temporaryPassword
                    ? "For your own security, please change this password from " +
                    "your profile the first time you sign in."
                    : "",

                "You can view your profile, apply for leave and see your " +
                "attendance from your account. If anything in the details above " +
                "looks wrong, reply to this email and our HR team will correct it.",
            ],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | The password reset
    |--------------------------------------------------------------------------
    | Sent when somebody asks for a reset link from the sign-in screen. Unlike
    | the two onboarding mails, this one is asked for rather than sent on
    | somebody's behalf, and it is the only mail here that a stranger can cause
    | to be sent - anybody who knows an address can type it into that screen.
    |
    | That shapes the wording. It says how long the link lasts and what to do
    | if the request was not theirs, because a person who did not ask for this
    | is one of its expected readers. It carries no employment details for the
    | same reason: an address typed by the wrong person must not be answered
    | with a summary of somebody's job.
    */
    function passwordReset_(data) {

        var companyName = data.companyName || "Your Company";

        return message_({
            companyName: companyName,

            subject: "Reset your " + companyName + " password",

            preheader:
                "A link to choose a new password for your " + companyName + " account.",

            heading: "Reset your password",

            intro: [
                "We received a request to reset the password for your " +
                companyName + " account. Choose a new one using the link below.",
            ],

            cards: [
                {
                    title: "Your account",
                    rows: [
                        { label: "Company Code", value: data.companyCode },
                        { label: "User ID", value: data.userId },
                    ],
                },
            ],

            action: {
                label: "Choose a New Password",
                href: data.resetLink || "",
            },

            closing: [
                "This link works once and expires in " +
                (data.expiresInHours || 1) + " hour" +
                ((data.expiresInHours || 1) === 1 ? "" : "s") + ".",

                "If you did not ask for this, you can ignore this email — your " +
                "password stays as it is until the link above is used.",
            ],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | The equipment submission form
    |--------------------------------------------------------------------------
    | Sent the moment HR approves somebody's resignation. It is the one email
    | in this file that asks the recipient to do something before a date rather
    | than simply telling them where to click, so the last working day is on
    | the card and named again in the closing paragraph.
    |
    | It goes to the work address, while they still have one. The certificate
    | below is the opposite case and says so.
    */
    function equipmentSubmission_(data) {

        var companyName = data.companyName || "Your Company";

        return message_({
            companyName: companyName,

            subject: "Return of company equipment — " + companyName,

            preheader:
                "Please confirm the company equipment you are returning before your last working day.",

            heading: "A last step before you go, " + (data.name || "there"),

            intro: [
                "Your resignation has been approved. Before your last working " +
                "day we need you to confirm what company equipment you hold and " +
                "what you are handing back.",

                data.equipmentList
                    ? "The items we usually issue are: " + data.equipmentList +
                    ". Please account for each one, including anything you were " +
                    "never given."
                    : "",
            ],

            cards: [
                {
                    title: "Your exit details",
                    rows: [
                        { label: "Employee ID", value: data.employeeId },
                        { label: "Designation", value: data.designation },
                        { label: "Department", value: data.department },
                        { label: "Last Working Day", value: data.lastWorkingDay },
                    ],
                },
            ],

            action: {
                label: "Complete the Equipment Form",
                href: data.equipmentLink || "",
            },

            closing: [
                "Sign in with your usual company credentials to open the form.",

                "Your full and final settlement is worked out once this form is " +
                "submitted, so completing it on time is what keeps your " +
                "settlement moving. Anything not returned may be recovered from it.",
            ],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | The No Objection Certificate
    |--------------------------------------------------------------------------
    | The last message of the whole relationship, sent once finance has signed
    | off the settlement.
    |
    | It is addressed to a former employee rather than a current one, which is
    | what shapes the wording: no instructions, nothing to action, and a tone
    | that reads as a testimonial instead of a transaction. It is also the only
    | email here likely to be forwarded to somebody else — a future employer
    | asking for proof of a clean exit — so the facts it certifies are stated
    | plainly on the card rather than being implied.
    |
    | It goes to the personal address on purpose. The company mailbox is being
    | closed at exactly this moment, and a certificate delivered there is one
    | nobody receives.
    */
    function exitNoc_(data) {

        var companyName = data.companyName || "Your Company";

        return message_({
            companyName: companyName,

            subject: "No Objection Certificate — " + companyName,

            preheader:
                "Your exit from " + companyName + " is complete. Your certificate is attached below.",

            heading: "Thank you, " + (data.name || "there"),

            intro: [
                "This is to certify that " + (data.name || "the employee") +
                " was employed with " + companyName +
                (data.designation ? " as " + data.designation : "") +
                " and was relieved from their duties on " +
                (data.lastWorkingDay || "their last working day") + ".",

                "All dues between " + companyName + " and the employee have been " +
                "settled in full, and the company has no objection to their " +
                "future employment elsewhere.",
            ],

            cards: [
                {
                    title: "Certified details",
                    rows: [
                        { label: "Employee ID", value: data.employeeId },
                        { label: "Designation", value: data.designation },
                        { label: "Department", value: data.department },
                        { label: "Date of Joining", value: data.joiningDate },
                        { label: "Last Working Day", value: data.lastWorkingDay },
                        {
                            label: data.settlementLabel || "Amount Settled",
                            value: data.settlementAmount,
                        },
                    ],
                },
            ],

            action: {
                label: "View & Print Your Certificate",
                href: data.certificateLink || "",
            },

            closing: [
                "A printable copy of this certificate is available at the link " +
                "above. Please keep it for your records.",

                "We wish you every success in what comes next.",
            ],
        });
    }

    /*
    | The four lines that describe somebody's job, shared because both emails
    | show exactly the same ones and they should not be able to disagree.
    */
    function employmentRows_(data) {

        return [
            { label: "Employee ID", value: data.employeeId },
            { label: "Designation", value: data.designation },
            { label: "Department", value: data.department },
            { label: "Date of Joining", value: data.joiningDate },
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | One description, both bodies
    |--------------------------------------------------------------------------
    | The HTML and the plain text are built here from the same `parts`, in one
    | pass. Writing them separately is how the two versions of an email quietly
    | stop matching — a paragraph edited in the HTML and forgotten in the text —
    | and this is the whole reason the templates above describe rather than draw.
    |
    | Anything empty falls away on its own: a card with no filled rows, a button
    | with no link, a closing paragraph that only applies sometimes.
    */
    function message_(parts) {

        var cards = (parts.cards || []).filter(function (card) {
            return filledRows_(card.rows).length > 0;
        });

        var intro = paragraphList_(parts.intro);

        var closing = paragraphList_(parts.closing);

        var action = parts.action && parts.action.href ? parts.action : null;

        var body =
            '<p class="heading" style="margin:0 0 16px;font-size:20px;line-height:28px;font-weight:bold;color:#0f172a;">' +
            escapeHtml_(parts.heading) +
            "</p>" +

            intro.map(paragraph_).join("") +

            cards.map(card_).join("") +

            (action
                ? '<div style="margin:0 0 20px;">' +
                button_(action.label, action.href) +
                "</div>" +

                '<p class="small" style="margin:0 0 8px;font-size:13px;line-height:20px;color:#64748b;">' +
                "If the button does not work, copy this link into your browser:" +
                "</p>" +

                '<p class="small" style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">' +
                '<a href="' + escapeHtml_(action.href) + '" style="color:#2563eb;">' +
                escapeHtml_(action.href) +
                "</a></p>"
                : "") +

            closing.map(paragraph_).join("");

        /*
        | The same content as blocks of plain text. They are joined with a blank
        | line between them, so a block is a paragraph and a card is its title
        | followed by its rows.
        */
        var blocks = [parts.heading].concat(intro);

        cards.forEach(function (card) {

            var lines = card.title ? [card.title] : [];

            filledRows_(card.rows).forEach(function (row) {
                lines.push(row.label + ": " + row.value);
            });

            blocks.push(lines.join("\n"));
        });

        if (action) {
            blocks.push(action.href);
        }

        return {
            subject: parts.subject,

            html: layout_({
                companyName: parts.companyName,
                preheader: parts.preheader,
                body: body,
            }),

            text: blocks
                .concat(closing)
                .filter(function (block) {
                    return block;
                })
                .join("\n\n"),
        };
    }

    /* Paragraphs a template chose not to include are dropped rather than
    printed as an empty line. */
    function paragraphList_(paragraphs) {

        return (paragraphs || []).filter(function (text) {
            return text;
        });
    }

    function paragraph_(text) {

        return '<p class="text" style="margin:0 0 20px;font-size:15px;line-height:24px;color:#475569;">' +
            escapeHtml_(text) +
            "</p>";
    }

    /* A panel of label/value rows, with an optional heading above them. */
    function card_(card) {

        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card"' +
            ' style="width:100%;margin:0 0 24px;padding:16px 20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">' +

            (card.title
                ? '<tr><td colspan="2" style="padding:0 0 10px;font-size:13px;font-weight:bold;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">' +
                escapeHtml_(card.title) +
                "</td></tr>"
                : "") +

            detailRows_(card.rows) +

            "</table>";
    }

    /*
    |--------------------------------------------------------------------------
    | The frame every template is poured into
    |--------------------------------------------------------------------------
    | Tables and inline styles rather than the CSS the rest of the project is
    | written in: Outlook lays an email out with the Word engine, which knows
    | nothing of flex, grid or a stylesheet's finer half.
    |
    | So the inline styles are the email — they are what an inbox that supports
    | the least still renders correctly, and on their own they are the desktop
    | layout. RESPONSIVE_CSS below is a second, narrower pass on top of them: one
    | media query that phones honour and Outlook ignores, which is exactly the
    | right division, since it is Outlook that is never on a phone.
    */

    /*
    | Everything here is `!important` because it is overriding an inline style,
    | which otherwise wins every time.
    |
    | 600px is the width the card is built to, so the query fires precisely when
    | the screen can no longer hold it. Below that: the padding comes in so the
    | text is not pinched against the edge, the type goes up rather than down —
    | 16px is the size below which iOS offers to zoom the page, and an email the
    | reader has to pinch is the thing being fixed — the label/value rows stack,
    | and the button spans the column so it is a thumb-sized target.
    */
    var RESPONSIVE_CSS =
        "<style>" +

        /* Some clients open the message in their own frame and shrink it to fit;
        these keep it at the phone's real width so the query below applies. */
        "body{margin:0!important;padding:0!important;width:100%!important;" +
        "-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}" +

        "table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}" +

        "img{border:0;outline:none;line-height:100%;-ms-interpolation-mode:bicubic;}" +

        "@media only screen and (max-width:600px){" +

        ".wrap{padding:16px 10px!important;}" +
        ".card-outer{border-radius:12px!important;}" +
        ".header{padding:20px!important;}" +
        ".content{padding:24px 20px!important;}" +
        ".footer{padding:16px 20px!important;}" +
        ".card{padding:14px 16px!important;}" +

        ".heading{font-size:22px!important;line-height:30px!important;}" +
        ".text{font-size:16px!important;line-height:26px!important;}" +
        ".small{font-size:14px!important;line-height:22px!important;}" +

        /* Label above value instead of beside it. */
        ".row-label,.row-value{display:block!important;width:100%!important;}" +
        ".row-label{padding:10px 0 2px!important;font-size:13px!important;}" +
        ".row-value{padding:0!important;font-size:16px!important;line-height:24px!important;}" +

        ".button-wrap{width:100%!important;}" +
        ".button{display:block!important;width:100%!important;" +
        "padding:16px 12px!important;font-size:16px!important;text-align:center!important;}" +

        "}" +

        "</style>";

    function layout_(parts) {

        return '<!doctype html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office"><head>' +
            '<meta charset="utf-8" />' +
            '<meta name="viewport" content="width=device-width,initial-scale=1" />' +
            '<meta http-equiv="X-UA-Compatible" content="IE=edge" />' +

            /* Apple Mail otherwise rescales the whole message on small screens,
            which undoes the media query before it is read. */
            '<meta name="x-apple-disable-message-reformatting" />' +

            "<title>" + escapeHtml_(parts.companyName) + "</title>" +

            /* Outlook renders at 120 DPI by default, which quietly inflates every
            pixel in the message by a quarter. */
            "<!--[if mso]><xml><o:OfficeDocumentSettings>" +
            "<o:PixelsPerInch>96</o:PixelsPerInch>" +
            "</o:OfficeDocumentSettings></xml><![endif]-->" +

            RESPONSIVE_CSS +

            '</head><body style="margin:0;padding:0;width:100%;background-color:#f1f5f9;">' +

            '<span style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">' +
            escapeHtml_(parts.preheader || "") +
            "</span>" +

            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f1f5f9;">' +
            '<tr><td align="center" class="wrap" style="padding:32px 16px;">' +

            /*
            | Outlook ignores max-width, so the card below would run the full
            | width of a maximised window. This holds it to 600 for Outlook only;
            | every other client sees a comment and obeys the max-width instead.
            */
            '<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' +

            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-outer"' +
            ' style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">' +

            '<tr><td class="header" style="padding:24px 32px;background-color:#2563eb;">' +
            '<p style="margin:0;font-size:18px;line-height:26px;font-weight:bold;color:#ffffff;">' +
            escapeHtml_(parts.companyName) +
            "</p></td></tr>" +

            '<tr><td class="content" style="padding:32px;">' + parts.body + "</td></tr>" +

            '<tr><td class="footer" style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">' +
            '<p style="margin:0;font-size:12px;color:#94a3b8;line-height:18px;">' +
            "This is an automated message from the " + escapeHtml_(parts.companyName) + " HR system. " +
            "Please do not reply to it. If you were not expecting this email, you can ignore it." +
            "</p></td></tr>" +

            "</table>" +

            "<!--[if mso]></td></tr></table><![endif]-->" +

            "</td></tr></table></body></html>";
    }

    /*
    | Rows of "label: value". Empty values are dropped rather than printed blank
    | — a missing joining date should not leave a dangling label in an inbox, and
    | a card left with no rows at all does not appear.
    */
    function filledRows_(rows) {

        return (rows || []).filter(function (item) {
            return item && item.value;
        });
    }

    /*
    | Label beside value on a wide screen; label above value on a narrow one. The
    | stylesheet turns both cells into blocks below 600px, because a two column
    | row on a phone gives a "Temporary Password" barely forty percent of 320
    | pixels and breaks the value it is meant to be showing.
    */
    function detailRows_(details) {

        return filledRows_(details)
            .map(function (item) {
                return "<tr>" +
                    '<td class="row-label" style="padding:6px 12px 6px 0;font-size:14px;line-height:20px;color:#64748b;width:40%;">' +
                    escapeHtml_(item.label) +
                    "</td>" +
                    '<td class="row-value" style="padding:6px 0;font-size:14px;line-height:20px;color:#0f172a;font-weight:600;word-break:break-word;">' +
                    escapeHtml_(item.value) +
                    "</td></tr>";
            })
            .join("");
    }

    /*
    | Sized to its label on a wide screen and stretched across the column on a
    | narrow one, where a button the width of its own text is a small target for
    | a thumb. The background sits on the cell as well as the link so a client
    | that drops the padding still shows a filled button rather than blue text.
    */
    function button_(label, href) {

        return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="button-wrap"><tr>' +
            '<td align="center" style="border-radius:12px;background-color:#2563eb;">' +
            '<a href="' + escapeHtml_(href) + '" class="button"' +
            ' style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">' +
            escapeHtml_(label) +
            "</a></td></tr></table>";
    }

    function escapeHtml_(value) {

        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isEmail_(value) {

        return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    }

    /*
    |--------------------------------------------------------------------------
    | The web app itself
    |--------------------------------------------------------------------------
    | Every answer is JSON, including the failures. The front end has one shape
    | to read, and a caller never has to tell a refusal apart from a crash by
    | looking at an HTML error page.
    */

    function reply_(payload) {

        return ContentService
            .createTextOutput(JSON.stringify(payload))
            .setMimeType(ContentService.MimeType.JSON);
    }

    function doPost(e) {

        try {

            var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

            if (API_KEY && body.key !== API_KEY) {
                return reply_({
                    success: false,
                    message: "Not authorised to use this email service.",
                });
            }

            var messages = Array.isArray(body.messages) ? body.messages : null;

            if (!messages) {
                return reply_({
                    success: false,
                    message: "Expected a JSON body with a `messages` array.",
                });
            }

            if (!messages.length) {
                return reply_({
                    success: false,
                    sent: 0,
                    failed: 0,
                    results: [],
                    message: "There is nobody to send to.",
                });
            }

            if (messages.length > MAX_MESSAGES) {
                return reply_({
                    success: false,
                    message:
                        "A single request may carry at most " + MAX_MESSAGES + " messages.",
                });
            }

            return reply_(
                sendAll_(body.template, messages, body.replyTo || "")
            );

        } catch (error) {

            return reply_({
                success: false,
                message:
                    "The email service failed: " +
                    (error && error.message ? error.message : String(error)),
            });

        }
    }

    /*
    | Opening the /exec URL in a browser should say something useful. It reports
    | whether the sheet can actually be reached and how much of today's quota is
    | left, which is the answer to most "why did nothing arrive" questions.
    */
    function doGet() {

        var reachable = true;
        var problem = "";

        try {
            getSheet_();
        } catch (error) {
            reachable = false;
            problem = error && error.message ? error.message : String(error);
        }

        return reply_({
            success: reachable,
            service: "hrms-email-service",
            sheet: SHEET_NAME,
            sheetReachable: reachable,
            remainingDailyQuota: MailApp.getRemainingDailyQuota(),
            templates: Object.keys(TEMPLATES),
            message: problem,
        });
    }
