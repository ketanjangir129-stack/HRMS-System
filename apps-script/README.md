# HRMS Email Service (Google Apps Script)

Every email the HRMS sends goes through one Apps Script web app. The app posts
the recipients to it; the script logs each one into a Google Sheet and then
sends the mail from the Google account that owns the script.

Two emails exist today, one at each end of onboarding:

| Template                | Sent when                                              | Carries                                            |
| ----------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `onboarding-invitation` | HR creates the invitation link, singly or in bulk       | The link to the onboarding form                     |
| `onboarding-approved`   | HR approves the form the joiner submitted               | The sign-in link, company code, user id, first password |

Both are poured into the same frame and built from the same employee details,
so the second reads like the first — see *Adding another email* below.

Sending from a Google account rather than a mail provider is what makes a
whole joining batch possible in one go: there is no per-recipient provider
limit to work around, only Google's own daily quota.

## Setting it up

1. **Make the spreadsheet.** Create a Google Sheet — call it anything, e.g.
   *HRMS Invitations*. You do not need to add any tabs or headings: the script
   creates the `Invitations` tab and its headings on the first send.

2. **Open the editor.** In that sheet: **Extensions ▸ Apps Script**.

3. **Paste the code.** Replace everything in `Code.gs` with the contents of
   [`Code.gs`](Code.gs) from this folder, and save.

4. **Check the settings** at the top of the file:

   | Constant         | What to put                                                                 |
   | ---------------- | --------------------------------------------------------------------------- |
   | `SPREADSHEET_ID` | Leave blank when the script is bound to the sheet (step 2). Otherwise the id from the sheet's URL. |
   | `SHEET_NAME`     | The tab to log into. `Invitations` by default.                               |
   | `API_KEY`        | Optional. Any random string; must match `VITE_EMAIL_SERVICE_KEY` in `.env`.  |
   | `SENDER_NAME`    | The name recipients see. The *address* is always the Google account running the script. |

5. **Deploy.** **Deploy ▸ New deployment ▸ Web app**, then:

   - **Execute as:** *Me* — the mail must be sent by your account.
   - **Who has access:** *Anyone* — **not** *Anyone with a Google Account*. The
     browser calls this with no Google session at all; any other setting sends
     the request to a sign-in page instead of to the script, and the app reports
     it as being unable to reach the email service.

   Authorise it when Google asks. The "unverified app" warning is expected for
   your own script: **Advanced ▸ Go to … (unsafe)**.

6. **Copy the Web app URL** — the one ending in `/exec` — into `.env`.

   The same dialog also shows a **Library** URL, and the two are easy to
   confuse. Only the first can receive a request:

   ```
   https://script.google.com/macros/s/AKfycb…/exec       ✅ Web app
   https://script.google.com/macros/library/d/1iJin…/4   ❌ Library id
   ```

   ```
   VITE_EMAIL_SERVICE_URL=https://script.google.com/macros/s/…/exec
   VITE_EMAIL_SERVICE_KEY=            # only if you set API_KEY above
   ```

   Restart `npm run dev` — Vite reads `.env` once, at start.

7. **Check it.** Open the `/exec` URL in a browser. It answers with JSON
   saying whether the sheet is reachable and how much sending quota is left
   today.

## After changing `Code.gs`

Edits are not live until they are deployed. Use **Deploy ▸ Manage deployments
▸ ✏️ ▸ Version: New version ▸ Deploy** — that keeps the same `/exec` URL, so
`.env` does not change. "New deployment" would issue a *different* URL.

## What lands in the sheet

One row per recipient, written *before* anything is sent:

| Logged At | Company Code | Company | Employee ID | Name | Email | Designation | Department | Joining Date | Link | Status | Message | Email Type |

One sheet serves every company and every template on the HRMS, which is why
the code is logged next to the name and the email type next to the outcome —
filter the tab by either to see one company's invitations, or everybody who
has been sent their sign-in details.

`Link` is whichever link that email carried: the onboarding form for an
invitation, the sign-in page for an approval.

A sheet started by an earlier version of `Code.gs` is brought up to date on
the next send — the heading row is rewritten in place. Columns here are only
ever renamed or added on the end, never reordered, so rows already on the
sheet keep their meaning.

`Status` starts as `Pending` and becomes `Sent` or `Failed` once that row has
been attempted. The order matters: Apps Script stops a run at six minutes, so
if a very long batch is cut off, the links are already safe on the sheet and
the rows still reading `Pending` are exactly the ones to send again.

## Limits worth knowing

- **Daily quota:** 100 recipients/day on a free `@gmail.com` account, 1,500/day
  on Google Workspace. A row that runs into the ceiling fails with a message
  saying so, and the rest of the batch is unaffected.
- **Per request:** the app sends 50 recipients per request and the script
  refuses more than 100, so a six-minute run is never in danger. A batch of
  400 is simply eight requests, which the app handles on its own.
- **The From address** cannot be changed here; it is the account that owns the
  script. Only the display name (`SENDER_NAME`) is ours to set.

## When sending fails

First check the URL in `.env` is the `/exec` one and not the library id — see
step 6. The app now says so plainly if it is wrong, but a build made before
that check will instead fail in the console with "No 'Access-Control-Allow-
Origin' header", which points nowhere near the real mistake.

Then open the `/exec` URL in a **private/incognito window** — that is the
closest thing to what the browser actually does, since it carries no Google
session.

- **A Google sign-in page appears** → the deployment's *Who has access* is not
  *Anyone*. Fix it as in step 5 and redeploy as a new version. This is by far
  the most common cause, and in the app it surfaces as "Could not reach the
  email service".
- **JSON with `"sheetReachable": false`** → `SPREADSHEET_ID` is wrong, or the
  script is not bound to a sheet. The `message` field says which.
- **JSON with `"remainingDailyQuota": 0`** → today's mail quota is spent.
  Sending resumes tomorrow; the sheet rows stay `Failed` in the meantime.
- **The JSON looks right but the app still fails** → the running deployment is
  an older version of `Code.gs`. Redeploy (see below).

## Adding another email later

A template in `Code.gs` does not draw anything. It *describes* the email — a
heading, some paragraphs, cards of label/value rows, and the one link the
message exists for — and `message_` builds the HTML and the plain text from
that description together, so the two can never drift apart:

```js
function contractRenewal_(data) {
    return message_({
        companyName: data.companyName,
        subject: "Your contract at " + data.companyName,
        preheader: "Please review and sign your renewed contract.",
        heading: "Hello " + data.name + ",",
        intro: ["Your contract has been renewed for another year."],
        cards: [{ title: "The details", rows: employmentRows_(data) }],
        action: { label: "Review and Sign", href: data.contractLink },
        closing: ["Reply to this email if anything looks wrong."],
    });
}
```

Anything empty falls away on its own: a card whose rows are all blank, a
button with no link, a paragraph that only applies sometimes.

Then:

1. Add an entry to `TEMPLATES` in `Code.gs` with the name and a label — the
   label is what the sheet's *Email Type* column and the per-row results say.
2. Add the same name to `EMAIL_TEMPLATES` in
   [emailService.js](../src/services/email/emailService.js).
3. Give the screens something to call, next to `sendInvitationEmail` and
   `sendApprovalEmail` in
   [onboardingEmailService.js](../src/services/email/onboardingEmailService.js).
   That is where the company is read for the letterhead and the employee is
   flattened into the shape the template expects.
4. Redeploy the script (see above) — a new template is not live until you do.

The layout, the sheet logging, the batching and the retry-safe failure
reporting are all already shared.

## How the layout handles phones

Because a template describes rather than draws, every email gets the same
responsive frame without asking for it — there is nothing to add to the
function above.

`layout_` writes each element twice over: an inline style, which is the
desktop layout and is all a client like Outlook will read, and a class picked
up by one media query in `RESPONSIVE_CSS` that fires at 600px and below —
the width the card is built to, so it triggers exactly when the screen can no
longer hold it. On a phone:

- the outer and inner padding come in, so text is not pinched against the edge
- body type steps **up** to 16px, the size below which iOS offers to zoom
- card rows stack, label above value, instead of splitting a narrow screen 40/60
- the button spans the column, making it a thumb-sized target

Outlook ignores the media query entirely, which is the right division — it is
never on a phone. It gets a conditional ghost table instead, because it does
not honour `max-width` and the card would otherwise run the full width of a
maximised window.

If you change the frame, check it at 320px as well as on a desktop. The
narrow end is where a two-column row or a fixed 32px padding gives out first.
