import { db } from "../firebase/firebase";
import { ref, get, update } from "firebase/database";

import { sendOwnerPasswordReset } from "./authService";
import { getCompanyByCode } from "./companyService";
import {
    EMAIL_TEMPLATES,
    sendEmail,
} from "./email/emailService";
import {
    RESET_TOKEN_TTL_MS,
    generateResetToken,
    hashResetToken,
    matchesResetToken,
} from "../utils/password";

/*
|--------------------------------------------------------------------------
| Password Reset
|--------------------------------------------------------------------------
| Getting back in after forgetting a password, for everybody who signs in to
| this app.
|
| Two kinds of account live behind one screen, and this is the seam between
| them. An employee - which is to say HR and manager too, since all three are
| the same record - has their password in the database, so the link, the page
| and the mail below are all ours. The owner's password belongs to Firebase
| Auth, which we cannot write into from a browser; their reset is handed to
| Firebase, which sends its own mail and hosts its own page.
|
| The person asking sees no difference: the same link on the sign-in screen,
| the same dialog, the same sentence afterwards.
|
| What they are told when it does not work is deliberately specific - a wrong
| company code, an unknown address and an account that has never been signed
| into each get their own answer. See `NOT_FOUND` for why this screen names
| what it could not find rather than hedging.
|
| What is stored is never the token. `account.resetTokenHash` holds a SHA-256
| of it and the link carries the original, so somebody reading the employee
| record - which, today, is anybody at all - learns nothing they could put in
| a link. See `utils/password`.
|--------------------------------------------------------------------------
*/

const normalize = (value) => String(value ?? "").trim().toLowerCase();

/*
| The link, built the way the onboarding invitation is: from the address the
| app is being served on, so it points at whichever deployment sent it rather
| than at a host written down somewhere.
|
| It carries the company code and the user id as well as the token because
| the token cannot be looked up on its own - only the hash is stored, and
| finding which record it belongs to would mean reading every one of them.
| With the id in the link we go straight to the record and compare.
*/
const buildResetLink = (companyCode, employeeId, token) =>
    `${window.location.origin}/reset-password/${companyCode}/${employeeId}/${token}`;

/* Said only once a mail has actually left. */
const SENT = {
    success: true,
    message: "A password reset link is on its way. Please check your inbox.",
};

/*
| The screen tells the truth about what it found, rather than answering every
| case with the same sentence.
|
| The usual advice is the opposite, and for a public sign-in page it is right:
| a screen that says "no account with that address" is a screen anybody can
| use to find out who is registered. It is a deliberate trade here, made for
| two reasons.
|
| A typo is the common case and silence is the wrong answer to it. Somebody
| who mistypes their own address would otherwise be told a link was sent,
| watch an empty inbox, and have no way of telling a slow mail server from a
| wrong letter - and the person this app is for cannot try another provider,
| they have exactly one address on their employee record.
|
| And the reach is narrower than a public page's. This is one company's
| internal system: an answer here is only had by somebody who already knows
| that company's code, and it only ever says whether an address belongs to
| that one company.
*/
const NOT_FOUND = {
    success: false,
    message:
        "No account found with this email. Please check the email and company code, or ask your HR.",
};

/*
| The employee whose record carries this email, or null.
|
| Read out of the company's own employees rather than through an index: there
| is none that maps an address to a person, and one company's directory is a
| single read. The email is compared from both places a record can hold it,
| the same way the rest of the app does - personal information for an employee
| who has filled their profile in, employment for one still carrying what HR
| typed when they were invited.
*/
const findEmployeeByEmail = async (companyCode, email) => {

    const snapshot = await get(ref(db, `companies/${companyCode}/employees`));

    if (!snapshot.exists()) return null;

    const employees = snapshot.val();

    const wanted = normalize(email);

    const employeeId = Object.keys(employees).find((key) => {

        const record = employees[key] || {};

        return (
            normalize(record.personalInfo?.email) === wanted ||
            normalize(record.employmentInfo?.email) === wanted
        );

    });

    return employeeId
        ? { employeeId, employee: employees[employeeId] }
        : null;

};

/*
|--------------------------------------------------------------------------
| Asking for a link
|--------------------------------------------------------------------------
| Company code as well as the email, because without it finding an address
| would mean reading every company in the database. The sign-in screen already
| asks for the code, so it is not something new to remember.
*/

export const requestPasswordReset = async (companyCode, email) => {

    const code = String(companyCode ?? "").trim().toUpperCase();

    const address = String(email ?? "").trim();

    if (!code || !address) {
        return {
            success: false,
            message: "Please enter your company code and email.",
        };
    }

    try {

        const company = await getCompanyByCode(code);

        /*
        | Named separately from a missing address. The two are different
        | mistakes and only the person making one can tell which they made -
        | an employee whose address is fine but whose company code is a digit
        | out would otherwise be sent looking at their own email for a fault
        | that is not there.
        */
        if (!company) {
            return {
                success: false,
                message:
                    "No company found with this code. Please check it and try again.",
            };
        }

        if (company.status !== "active") {
            return {
                success: false,
                message:
                    "This company account is inactive. Please contact your administrator.",
            };
        }

        const companyName = company.companyName || "Your Company";

        /*
        | The owner, who is the one account here that Firebase Auth holds.
        | Their reset is Firebase's to send, and it answers the same way for
        | an address it does not know - so there is nothing to check first.
        */
        if (normalize(company.email) === normalize(address)) {

            const result = await sendOwnerPasswordReset(address);

            return result.success ? SENT : result;

        }

        const found = await findEmployeeByEmail(code, address);

        if (!found) {
            return NOT_FOUND;
        }

        const { employeeId, employee } = found;

        /*
        | A deactivated account cannot sign in even with the right password,
        | so a link would only lead somewhere that refuses them. Said plainly,
        | and pointing at the one person who can undo it: an ex-employee needs
        | to know their access is gone rather than that their email is wrong,
        | and somebody deactivated by mistake needs HR, not another attempt.
        */
        if (employee.account?.status !== "Active") {
            return {
                success: false,
                message:
                    "This account is inactive and cannot be used to sign in. Please contact your HR.",
            };
        }

        /*
        | Somebody who has never signed in is sent back to the front door
        | rather than given a link.
        |
        | They are not locked out - they are holding the password already, it
        | is their employee id, and the forced change screen is waiting for
        | them behind it. A reset here would be a second way of arriving at
        | that same screen, and the more expensive one: it needs an inbox they
        | may not have set up yet on a work account that is a day old.
        |
        | So the message names the password rather than only refusing. The
        | person reading it has usually forgotten what the joining email told
        | them, which is the whole reason they are on this screen.
        |
        | The sign-in page cannot make this decision for itself. Nobody has
        | identified themselves to it yet, so the button stays where it is and
        | the answer is given here, where there is a record to read.
        */
        if (employee.account?.isPasswordChanged === false) {
            return {
                success: false,
                message:
                    `You have not set your own password yet. Sign in with your Employee ID (${employeeId}) as both the User ID and the password, and you will be asked to choose one.`,
            };
        }

        const token = generateResetToken();

        /*
        | Written before the mail goes out. The other order would risk a link
        | arriving that the database has never heard of, which reads to the
        | person holding it as the reset being broken.
        |
        | Key by key, not by replacing the account node: it also carries the
        | username, password, role and status, and asking for a link has no
        | business touching any of them.
        */
        await update(
            ref(db, `companies/${code}/employees/${employeeId}`),
            {
                "account/resetTokenHash": await hashResetToken(token),
                "account/resetExpiresAt": Date.now() + RESET_TOKEN_TTL_MS,
            }
        );

        const sent = await sendEmail({
            template: EMAIL_TEMPLATES.PASSWORD_RESET,
            to: address,
            data: {
                companyName,
                companyCode: code,
                userId: employeeId,
                resetLink: buildResetLink(code, employeeId, token),
                expiresInHours: RESET_TOKEN_TTL_MS / (60 * 60 * 1000),
            },
        });

        /*
        | The mail failing is worth saying out loud. Everything above it
        | succeeded, so the token is sitting in the record waiting for a link
        | that never arrived - and the person would otherwise be sent off to
        | watch an inbox for nothing.
        */
        if (!sent.success) {
            return {
                success: false,
                message:
                    sent.message ||
                    "We could not send the reset email. Please try again.",
            };
        }

        return SENT;

    } catch (error) {
        console.error("Failed to request a password reset:", error);

        return {
            success: false,
            message: "Something went wrong. Please try again.",
        };
    }

};

/*
|--------------------------------------------------------------------------
| Checking a link
|--------------------------------------------------------------------------
| Run when the reset page opens, so somebody is told the link is no good
| before they are asked to think up a password rather than after.
|
| Every refusal says the same thing. The three ways a link can fail - wrong,
| expired, already used - are the same thing to the person reading it, and
| distinguishing them would confirm to a stranger that a real reset had been
| asked for.
*/

const INVALID = {
    valid: false,
    message:
        "This password reset link is no longer valid. It may have expired or already been used.",
};

export const verifyResetToken = async (companyCode, employeeId, token) => {

    try {

        const snapshot = await get(
            ref(
                db,
                `companies/${companyCode}/employees/${String(employeeId).toUpperCase()}/account`
            )
        );

        if (!snapshot.exists()) return INVALID;

        const account = snapshot.val();

        if (!account.resetTokenHash || !account.resetExpiresAt) {
            return INVALID;
        }

        if (Date.now() > account.resetExpiresAt) {
            return INVALID;
        }

        if (!(await matchesResetToken(token, account.resetTokenHash))) {
            return INVALID;
        }

        /* Nothing secret goes back - only what the page puts on screen. */
        return { valid: true, username: account.username || employeeId };

    } catch (error) {
        console.error("Failed to verify a reset token:", error);
        return INVALID;
    }

};

/*
|--------------------------------------------------------------------------
| Using a link
|--------------------------------------------------------------------------
| The token is checked again here rather than trusted from the page's own
| earlier call. Between the two the link may have expired, or been used in
| another tab, and the check that matters is the one next to the write.
*/

export const resetPasswordWithToken = async (
    companyCode,
    employeeId,
    token,
    newPassword
) => {

    try {

        const id = String(employeeId).toUpperCase();

        const check = await verifyResetToken(companyCode, id, token);

        if (!check.valid) {
            return { success: false, message: check.message };
        }

        /*
        | The password and the end of the link, together.
        |
        | Clearing the hash is what makes a link single use - there is no
        | "used" flag to keep, because a token that cannot be matched again is
        | already spent. And `isPasswordChanged` goes true rather than false:
        | this password was chosen by the person who will use it, so sending
        | them on to the forced change screen would ask them to choose a
        | second one for no reason.
        */
        await update(
            ref(db, `companies/${companyCode}/employees/${id}`),
            {
                "account/password": newPassword,
                "account/isPasswordChanged": true,
                "account/resetTokenHash": null,
                "account/resetExpiresAt": null,
            }
        );

        return { success: true };

    } catch (error) {
        console.error("Failed to reset a password:", error);

        return {
            success: false,
            message: "Failed to update your password. Please try again.",
        };
    }

};
