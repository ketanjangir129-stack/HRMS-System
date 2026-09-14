import {
    EMAIL_TEMPLATES,
    isEmailServiceConfigured,
    sendBulkEmails,
    sendEmail,
} from "./emailService";

import { getCompanyByCode } from "../companyService";

import { markInvitationEmailSent } from "../OnboardingService";

import { markApprovalEmailSent } from "../ApprovalService";

/*
|--------------------------------------------------------------------------
| Onboarding Emails
|--------------------------------------------------------------------------
| What the onboarding screens call. It sits between them and the common
| `emailService` so that no screen has to know a template's name, what data
| it wants, or that the company has to be read for the letterhead and for the
| sheet the sends are logged in.
|
| Onboarding sends the joiner two emails, one at each end of it:
|
|   the invitation  — when HR creates the link, so they can fill the form
|   the approval    — when HR approves what they filled in, with their sign-in
|
| Both are built from the same employee shape and go out through the same
| service, so an invitation is identical whether it came from one form or a
| file of two hundred rows, and an approval reads like the invitation that
| preceded it.
|--------------------------------------------------------------------------
*/

export { isEmailServiceConfigured };

/* "12 Aug 2026" — the joining date as a person would write it. */
const formatJoiningDate = (value) => {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
};

/*
| The company is read for its name and its address, and it is read once per
| send even for a bulk run: two hundred invitations should cost one lookup,
| not two hundred. A company that cannot be read is not worth failing over —
| the template falls back to a neutral name and the link still goes out.
*/
const loadCompany = async (companyCode) => {

    try {

        const details = await getCompanyByCode(companyCode);

        return {
            companyCode,
            companyName: details?.companyName || "Your Company",
            email: details?.email || "",
        };

    } catch (error) {

        console.error("Could not read the company for the invitation email:", error);

        return {
            companyCode,
            companyName: "Your Company",
            email: "",
        };

    }
};

/*
| An onboarding record, a bulk result row, an approved employee and the
| form's own state all describe the same person in slightly different words.
| They are flattened here so a template only ever sees one shape — and so the
| two emails cannot end up describing the same job differently.
*/
const buildEmployeeData = (company, employee) => ({
    companyCode: company.companyCode || "",
    companyName: company.companyName,
    name: employee.name || "",
    employeeId: employee.employeeId || "",
    designation: employee.designation || "",
    department: employee.department || "",
    joiningDate: formatJoiningDate(employee.joiningDate),
});

const buildInvitationData = (company, employee) => ({
    ...buildEmployeeData(company, employee),
    invitationLink: employee.invitationLink || "",
});

/*
| The sign-in page, built the same way the invitation link is: from wherever
| this app is being served, so a test build never sends anybody to production.
*/
const buildLoginLink = () => `${window.location.origin}/login`;

/*
| The approval email carries the credentials the account was created with,
| and only while they are still the ones that work. Once the employee has
| chosen their own password there is nothing to quote, so the row is left
| empty and the template drops it rather than printing a password that would
| be refused at the login screen.
*/
const buildApprovalData = (company, employee) => ({
    ...buildEmployeeData(company, employee),
    loginLink: buildLoginLink(),
    username: employee.username || employee.employeeId || "",
    temporaryPassword: employee.temporaryPassword || "",
});

/*
|--------------------------------------------------------------------------
| One Invitation
|--------------------------------------------------------------------------
| `employee` needs an `email` and an `invitationLink`; everything else it
| carries is shown in the email if present and left out if not.
*/

export const sendInvitationEmail = async (companyCode, employee) => {

    if (!employee?.invitationLink) {
        return {
            success: false,
            message: "There is no invitation link to send yet.",
        };
    }

    const company = await loadCompany(companyCode);

    const result = await sendEmail({
        template: EMAIL_TEMPLATES.ONBOARDING_INVITATION,
        to: employee.email,
        data: buildInvitationData(company, employee),
        replyTo: company.email,
    });

    if (result.success) {
        await markInvitationEmailSent(companyCode, employee.employeeId);
    }

    return {
        ...result,
        message: result.success
            ? `Invitation emailed to ${employee.email}.`
            : result.message,
    };
};

/*
|--------------------------------------------------------------------------
| Many Invitations
|--------------------------------------------------------------------------
| Sends every employee handed in and reports on each one by employee id, so
| the screen can mark its own rows sent or failed rather than showing a
| single verdict over a batch that was partly delivered.
|
| Rows without a link never leave: an employee whose onboarding record failed
| to be created has nothing to be invited to.
*/

export const sendInvitationEmails = async (companyCode, employees = []) => {

    const invitable = employees.filter((item) => item?.invitationLink);

    if (!invitable.length) {
        return {
            success: false,
            sent: 0,
            failed: 0,
            results: [],
            message: "There are no invitation links to send.",
        };
    }

    const company = await loadCompany(companyCode);

    const outcome = await sendBulkEmails({
        template: EMAIL_TEMPLATES.ONBOARDING_INVITATION,
        replyTo: company.email,
        messages: invitable.map((employee) => ({
            ref: employee.employeeId,
            to: employee.email,
            data: buildInvitationData(company, employee),
        })),
    });

    /*
    | Stamping the records is deliberately not allowed to sink the send. The
    | emails are already gone by this point, and a write that fails should
    | leave the screen saying so rather than claiming nothing was sent.
    */
    const delivered = outcome.results
        .filter((item) => item.success && item.ref)
        .map((item) => item.ref);

    if (delivered.length) {

        await Promise.all(
            delivered.map((employeeId) =>
                markInvitationEmailSent(companyCode, employeeId)
            )
        );

    }

    return outcome;
};

/*
|--------------------------------------------------------------------------
| The Approval
|--------------------------------------------------------------------------
| Sent once HR has approved the submitted form and the employee record
| exists. `employee` needs an `email`; `username` and `temporaryPassword` are
| shown when they are handed in and quietly left out when they are not.
|
| Like the invitation, this never throws and never reports a mail failure as
| an approval failure — by the time it is called the employee is already
| approved, and a screen that said otherwise would send somebody looking for
| a record that is sitting there perfectly well.
*/

export const sendApprovalEmail = async (companyCode, employee) => {

    if (!employee?.email) {
        return {
            success: false,
            message: "No email address on record for this employee.",
        };
    }

    const company = await loadCompany(companyCode);

    const result = await sendEmail({
        template: EMAIL_TEMPLATES.ONBOARDING_APPROVED,
        to: employee.email,
        data: buildApprovalData(company, employee),
        replyTo: company.email,
    });

    if (result.success) {
        await markApprovalEmailSent(companyCode, employee.employeeId);
    }

    return {
        ...result,
        message: result.success
            ? `Approval emailed to ${employee.email}.`
            : result.message,
    };
};

/*
|--------------------------------------------------------------------------
| Many Approvals
|--------------------------------------------------------------------------
| The counterpart to the bulk invitation: one company lookup for the whole
| batch, one outcome per employee id, and nothing here allowed to report a
| mail failure as an approval failure — every employee handed in is already
| approved by the time this is called.
*/

export const sendApprovalEmails = async (companyCode, employees = []) => {

    if (!employees.length) {
        return {
            success: false,
            sent: 0,
            failed: 0,
            results: [],
            message: "There is nobody to send to.",
        };
    }

    const company = await loadCompany(companyCode);

    const outcome = await sendBulkEmails({
        template: EMAIL_TEMPLATES.ONBOARDING_APPROVED,
        replyTo: company.email,
        messages: employees.map((employee) => ({
            ref: employee.employeeId,
            to: employee.email,
            data: buildApprovalData(company, employee),
        })),
    });

    /* Stamping never sinks the send — the emails are already gone. */
    const delivered = outcome.results
        .filter((item) => item.success && item.ref)
        .map((item) => item.ref);

    if (delivered.length) {

        await Promise.all(
            delivered.map((employeeId) =>
                markApprovalEmailSent(companyCode, employeeId)
            )
        );

    }

    return outcome;
};
