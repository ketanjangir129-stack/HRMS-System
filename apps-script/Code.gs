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

/* The tab within it. Created with its headings if it does not exist yet. */
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
    "Invitation Link",
    "Status",
    "Message",
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

    if (sheet.getLastRow() === 0) {

        sheet
            .getRange(1, 1, 1, HEADINGS.length)
            .setValues([HEADINGS])
            .setFontWeight("bold");

        sheet.setFrozenRows(1);
    }

    return sheet;
}

/*
| One employee, one row, in the order the headings promise. The link is
| written as plain text so a sheet full of them stays copyable rather than
| turning into two hundred chips.
*/
function toSheetRow_(message) {

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
        data.invitationLink || "",
        "Pending",
        "",
    ];
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
        .setValues(messages.map(toSheetRow_));

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

        return { success: true, message: "Invitation emailed." };

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
| A new email is a function here and a line in renderTemplate_.
*/

function renderTemplate_(name, data) {

    if (name === "onboarding-invitation") {
        return onboardingInvitation_(data);
    }

    return null;
}

/*
| The email a new joiner receives once HR has generated their invitation
| link. The link is the whole point of the message, so it appears twice: as
| the button, and as text underneath it for the clients that strip buttons.
*/
function onboardingInvitation_(data) {

    var companyName = data.companyName || "Your Company";

    var name = data.name || "there";

    var link = data.invitationLink || "";

    var details = detailRows_([
        { label: "Employee ID", value: data.employeeId },
        { label: "Designation", value: data.designation },
        { label: "Department", value: data.department },
        { label: "Date of Joining", value: data.joiningDate },
    ]);

    var body =
        '<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#0f172a;">' +
        "Welcome aboard, " + escapeHtml_(name) + "!" +
        "</p>" +

        '<p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#475569;">' +
        "We are delighted to have you joining " + escapeHtml_(companyName) + ". " +
        "To get your paperwork out of the way before day one, please complete " +
        "your onboarding form using the link below." +
        "</p>" +

        (details
            ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"' +
              ' style="margin:0 0 24px;padding:16px 20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">' +
              details +
              "</table>"
            : "") +

        '<div style="margin:0 0 20px;">' +
        button_("Complete Your Onboarding", link) +
        "</div>" +

        '<p style="margin:0 0 8px;font-size:13px;color:#64748b;">' +
        "If the button does not work, copy this link into your browser:" +
        "</p>" +

        '<p style="margin:0 0 24px;font-size:13px;word-break:break-all;">' +
        '<a href="' + escapeHtml_(link) + '" style="color:#2563eb;">' +
        escapeHtml_(link) +
        "</a></p>" +

        '<p style="margin:0;font-size:14px;line-height:22px;color:#475569;">' +
        "Keep your identity, bank and education documents handy — the form asks " +
        "for them. Once you submit it, our HR team reviews the details and " +
        "confirms your onboarding." +
        "</p>";

    /*
    | The plain text alternative. A detail the employee does not have is
    | dropped as `null`; the empty strings are the paragraph breaks and are
    | meant to survive, which is why the filter looks for null rather than
    | for anything falsy.
    */
    var text = [
        "Welcome aboard, " + name + "!",
        "",
        "We are delighted to have you joining " + companyName + ".",
        "Please complete your onboarding form using the link below.",
        "",
        data.employeeId ? "Employee ID: " + data.employeeId : null,
        data.designation ? "Designation: " + data.designation : null,
        data.department ? "Department: " + data.department : null,
        data.joiningDate ? "Date of Joining: " + data.joiningDate : null,
        "",
        link,
        "",
        "Keep your identity, bank and education documents handy — the form asks for them.",
    ]
        .filter(function (line) {
            return line !== null;
        })
        .join("\n");

    return {
        subject: "Complete your onboarding with " + companyName,
        html: layout_({
            companyName: companyName,
            preheader: "Your onboarding form for " + companyName + " is ready to fill in.",
            body: body,
        }),
        text: text,
    };
}

/*
|--------------------------------------------------------------------------
| The frame every template is poured into
|--------------------------------------------------------------------------
| Tables and inline styles rather than the CSS the rest of the project is
| written in: Outlook and Gmail throw away stylesheets, and a flex layout
| that looks right in the browser collapses in an inbox.
*/

function layout_(parts) {

    return '<!doctype html><html><head>' +
        '<meta charset="utf-8" />' +
        '<meta name="viewport" content="width=device-width,initial-scale=1" />' +
        "<title>" + escapeHtml_(parts.companyName) + "</title>" +
        '</head><body style="margin:0;padding:0;background-color:#f1f5f9;">' +

        '<span style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">' +
        escapeHtml_(parts.preheader || "") +
        "</span>" +

        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">' +
        '<tr><td align="center" style="padding:32px 16px;">' +

        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"' +
        ' style="max-width:600px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">' +

        '<tr><td style="padding:24px 32px;background-color:#2563eb;">' +
        '<p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;">' +
        escapeHtml_(parts.companyName) +
        "</p></td></tr>" +

        '<tr><td style="padding:32px;">' + parts.body + "</td></tr>" +

        '<tr><td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">' +
        '<p style="margin:0;font-size:12px;color:#94a3b8;line-height:18px;">' +
        "This is an automated message from the " + escapeHtml_(parts.companyName) + " HR system. " +
        "Please do not reply to it. If you were not expecting this email, you can ignore it." +
        "</p></td></tr>" +

        "</table></td></tr></table></body></html>";
}

/*
| Rows of "label: value". Empty values are dropped rather than printed blank
| — a missing joining date should not leave a dangling label in an inbox.
*/
function detailRows_(details) {

    return details
        .filter(function (item) {
            return item.value;
        })
        .map(function (item) {
            return "<tr>" +
                '<td style="padding:6px 0;font-size:14px;color:#64748b;width:40%;">' +
                escapeHtml_(item.label) +
                "</td>" +
                '<td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">' +
                escapeHtml_(item.value) +
                "</td></tr>";
        })
        .join("");
}

function button_(label, href) {

    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td style="border-radius:12px;background-color:#2563eb;">' +
        '<a href="' + escapeHtml_(href) + '"' +
        ' style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">' +
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
        templates: ["onboarding-invitation"],
        message: problem,
    });
}
