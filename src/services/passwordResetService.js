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
| the same dialog, the same sentence afterwards. That sentence is the same for
| an address with no account, too, which is the reason for most of the shape
| of `requestPasswordReset` below.
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

/*
| What every caller of `requestPasswordReset` is told, whatever happened.
|
| An honest "no account with that email" would turn the sign-in screen into a
| way of asking which addresses are registered with a company - which is worth
| knowing to somebody preparing a more convincing email later. So a missing
| account, an inactive one and a mail that was sent all end here.
|
| Genuine failures - the mail service being unreachable, the database being
| down - are reported, because a person who is told to go and wait for an
| email that was never sent has been left with nothing to do.
*/
const SENT = {
    success: true,
    message:
        "If that email has an account, a password reset link is on its way. Please check your inbox.",
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
        | A company that does not exist is answered like an address that does
        | not: saying so would let somebody probe for valid company codes from
        | a screen that asks nothing of them.
        */
        if (!company || company.status !== "active") {
            return SENT;
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
            return SENT;
        }

        const { employeeId, employee } = found;

        /*
        | A deactivated account cannot sign in even with the right password,
        | so a link would only lead somewhere that refuses them. Answered like
        | an unknown address rather than explained, for the same reason as the
        | rest: this screen tells a stranger nothing about who exists.
        */
        if (employee.account?.status !== "Active") {
            return SENT;
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
