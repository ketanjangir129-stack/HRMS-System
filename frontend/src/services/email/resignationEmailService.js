import {
  EMAIL_TEMPLATES,
  isEmailServiceConfigured,
  sendEmail,
} from "./emailService";

import { getCompanyByCode } from "../companyService";

import {
  EQUIPMENT_ITEMS,
} from "../../utils/resignation/resignationConstants";

import { formatDate } from "../../utils/resignation/resignationUtils";

import { formatCurrency } from "../../utils/salary/formatCurrency";

/*
|--------------------------------------------------------------------------
| Resignation Emails
|--------------------------------------------------------------------------
| The two messages an exit sends, and the only place that knows their
| template names or what data they want. Shaped like
| `onboardingEmailService` beside it and for the same reason: no screen and
| no service should have to know that the company has to be read for the
| letterhead before anything can be sent.
|
| The two are addressed differently on purpose, and that difference is the
| most important thing in this file:
|
|   the equipment form  -> the work address, while the employee still has it
|   the certificate     -> the personal address, because by then they do not
|
| Neither throws. Both come back as `{ success, message }` for the caller to
| show, because in both cases the decision they are announcing has already
| been written and a mail failure must not read as that decision failing.
|--------------------------------------------------------------------------
*/

export { isEmailServiceConfigured };

/*
| Read once per send for the letterhead and the reply-to address. A company
| that cannot be read falls back to a neutral name rather than failing the
| send - the same trade the onboarding emails make.
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

    console.error("Could not read the company for the exit email:", error);

    return {
      companyCode,
      companyName: "Your Company",
      email: "",
    };

  }

};

/*
| Links are built from wherever this app is being served, exactly as the
| onboarding invitation builds its own, so a staging build never sends
| anybody to production.
*/

const buildEquipmentLink = (resignationId) =>
  `${window.location.origin}/resignation/equipment/${resignationId}`;

const buildNocLink = (resignationId) =>
  `${window.location.origin}/resignation/noc/${resignationId}`;

/* The fields both templates print about the person leaving. */
const buildEmployeeData = (company, resignation) => ({
  companyCode: company.companyCode || "",
  companyName: company.companyName,
  name: resignation?.name || "",
  employeeId: resignation?.employeeId || "",
  designation: resignation?.designation || "",
  department: resignation?.department || "",
  joiningDate: formatDate(resignation?.joiningDate),
  lastWorkingDay: formatDate(resignation?.lastWorkingDay),
});

/*
|--------------------------------------------------------------------------
| The Equipment Submission Form
|--------------------------------------------------------------------------
| Sent the moment HR approves the resignation. It carries the list of what
| the company issues so the employee can gather it before they open the form,
| rather than discovering the fourth item once they are already filling it
| in.
|
| The list is named from `EQUIPMENT_ITEMS`, so adding an item to the form
| adds it to this email without anybody having to remember to.
|--------------------------------------------------------------------------
*/

export const sendEquipmentSubmissionEmail = async (
  companyCode,
  resignation
) => {

  const to = resignation?.email;

  if (!to) {
    return {
      success: false,
      message: "No work email address on record for this employee.",
    };
  }

  const company = await loadCompany(companyCode);

  const result = await sendEmail({
    template: EMAIL_TEMPLATES.EQUIPMENT_SUBMISSION,
    to,
    replyTo: company.email,
    data: {
      ...buildEmployeeData(company, resignation),
      equipmentList: EQUIPMENT_ITEMS.map((item) => item.label).join(", "),
      equipmentLink: buildEquipmentLink(resignation?.resignationId),
    },
  });

  return {
    ...result,
    to,
    message: result.success
      ? `Equipment form emailed to ${to}.`
      : result.message,
  };

};

/*
|--------------------------------------------------------------------------
| The No Objection Certificate
|--------------------------------------------------------------------------
| Sent once finance has approved the settlement and the exit is complete.
|
| It goes to the personal address and falls back to the work one only if no
| personal address was ever recorded. That fallback is worth having - a
| certificate sent to a mailbox that is about to close is better than one
| that is never sent at all - but it is the second choice, and the caller is
| told which address was actually used so HR can follow it up.
|
| The settlement figure is printed because it is the thing the certificate is
| evidence of. "No dues outstanding" means nothing without the amount it was
| settled at.
|--------------------------------------------------------------------------
*/

export const sendNocEmail = async (companyCode, resignation) => {

  const to = resignation?.personalEmail || resignation?.email;

  if (!to) {
    return {
      success: false,
      message: "No email address on record to send the certificate to.",
    };
  }

  const company = await loadCompany(companyCode);

  const totals = resignation?.fnf?.totals || {};

  const netPayable = Number(totals.netPayable) || 0;

  const result = await sendEmail({
    template: EMAIL_TEMPLATES.EXIT_NOC,
    to,
    replyTo: company.email,
    data: {
      ...buildEmployeeData(company, resignation),
      /*
      | A negative settlement is a recovery, and saying "Amount Settled:
      | ₹ -4,000" in a certificate would be both ugly and ambiguous. The sign
      | is turned into words here so the template never has to know about it.
      */
      settlementLabel: netPayable < 0 ? "Amount Recovered" : "Amount Settled",
      settlementAmount: formatCurrency(Math.abs(netPayable)),
      certificateLink: buildNocLink(resignation?.resignationId),
    },
  });

  return {
    ...result,
    to,
    message: result.success
      ? `Certificate emailed to ${to}.`
      : result.message,
  };

};
