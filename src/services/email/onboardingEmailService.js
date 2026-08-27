import {
    EMAIL_TEMPLATES,
    isEmailServiceConfigured,
    sendBulkEmails,
    sendEmail,
} from "./emailService";

import { getCompanyByCode } from "../companyService";

import { markInvitationEmailSent } from "../OnboardingService";

/*
|--------------------------------------------------------------------------
| Onboarding Invitation Emails
|--------------------------------------------------------------------------
| What the onboarding screens call. It sits between them and the common
| `emailService` so that neither the single form nor the bulk import has to
| know the template's name, what data it wants, or that the company has to be
| read for the letterhead and for the sheet the sends are logged in.
|
| Both entry points send the same email through the same template, so an
| invitation is identical whether it came from one form or from a file of two
| hundred rows.
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
| An onboarding record, a bulk result row and the form's own state all
| describe the same person in slightly different words. They are flattened
| here so the template only ever sees one shape.
*/
const buildInvitationData = (company, employee) => ({
    companyCode: company.companyCode || "",
    companyName: company.companyName,
    name: employee.name || "",
    employeeId: employee.employeeId || "",
    designation: employee.designation || "",
    department: employee.department || "",
    joiningDate: formatJoiningDate(employee.joiningDate),
    invitationLink: employee.invitationLink || "",
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
