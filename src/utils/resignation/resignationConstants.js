/*
|--------------------------------------------------------------------------
| Resignation Constants
|--------------------------------------------------------------------------
| The exit journey, declared once: the states a resignation moves through,
| the order they happen in, the equipment the company hands out, and the
| lines a Full & Final settlement is made of.
|
| Everything else in the module reads this file rather than restating any of
| it. The status badge, the progress tracker, the approval queues, the route
| guards and the service transitions are all derived from the STAGES list
| below, so adding a step is one entry here instead of an edit in six places.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
| One field on the record carries the whole lifecycle. It is a single string
| rather than a set of booleans (`managerApproved`, `hrApproved`, `exited`)
| on purpose: booleans can disagree with one another, and a resignation that
| is both rejected by its manager and awaiting finance is not a state anybody
| can reason about.
|
| The values are the words shown on screen. A status is read far more often
| than it is compared, and storing "Manager Approval Pending" rather than
| "MGR_PEND" means a record read straight out of Firebase says what it is.
|--------------------------------------------------------------------------
*/

export const RESIGNATION_STATUS = {

  /* Raised by the employee, sitting with the manager of their department. */
  MANAGER_PENDING: "Manager Approval Pending",

  /* Turned down. Terminal, and always carries a reason. */
  MANAGER_REJECTED: "Rejected by Manager",

  /* The manager agreed; it is now with the HR responsible for that
     department. */
  HR_PENDING: "HR Approval Pending",

  HR_REJECTED: "Rejected by HR",

  /*
  | HR accepted the resignation. The employee has been emailed the equipment
  | form and the exit cannot move until they have returned it - which is the
  | whole reason this is a state of its own rather than a checkbox on the
  | settlement.
  */
  EQUIPMENT_PENDING: "Equipment Submission Pending",

  /* Equipment declared. HR can now price the settlement. */
  FNF_PENDING: "Full & Final Pending",

  /* HR has priced it and sent it to be checked. */
  FNF_REVIEW: "Full & Final Under Review",

  /* Checked, and waiting on whoever holds the finance approval. */
  FINANCE_PENDING: "Finance Approval Pending",

  /* Settled, exited, NOC issued. Terminal. */
  EXITED: "Exited",

};

/*
| The two ways a resignation can end without an exit. Grouped because every
| screen that asks "is this still moving" asks about both together.
*/

export const REJECTED_STATUSES = [
  RESIGNATION_STATUS.MANAGER_REJECTED,
  RESIGNATION_STATUS.HR_REJECTED,
];

export const isRejectedStatus = (status) =>
  REJECTED_STATUSES.includes(status);

export const isClosedStatus = (status) =>
  status === RESIGNATION_STATUS.EXITED || isRejectedStatus(status);

/*
|--------------------------------------------------------------------------
| Stages
|--------------------------------------------------------------------------
| The same journey as a list, which is what the progress tracker draws and
| what `getStageIndex` compares against to decide whether a step has been
| passed.
|
| Rejections are deliberately absent. They are not a step on the way to
| anywhere - a rejected resignation stops where it stands, and the tracker
| marks the stage it stopped at rather than moving on to a seventh circle.
|--------------------------------------------------------------------------
*/

export const RESIGNATION_STAGES = [
  {
    status: RESIGNATION_STATUS.MANAGER_PENDING,
    label: "Manager Approval",
    description: "Your department manager reviews the resignation",
  },
  {
    status: RESIGNATION_STATUS.HR_PENDING,
    label: "HR Approval",
    description: "HR confirms the exit and the last working day",
  },
  {
    status: RESIGNATION_STATUS.EQUIPMENT_PENDING,
    label: "Equipment Return",
    description: "Company assets are declared and handed back",
  },
  {
    status: RESIGNATION_STATUS.FNF_PENDING,
    label: "Full & Final",
    description: "HR works out what is payable and what is recovered",
  },
  {
    status: RESIGNATION_STATUS.FNF_REVIEW,
    label: "HR Review",
    description: "The settlement is checked before it is sent on",
  },
  {
    status: RESIGNATION_STATUS.FINANCE_PENDING,
    label: "Finance Approval",
    description: "Finance signs off the settlement",
  },
  {
    status: RESIGNATION_STATUS.EXITED,
    label: "Exit & NOC",
    description: "The exit is recorded and the certificate is issued",
  },
];

/*
| Where a status sits in the journey, or -1 for one that is not on it. Used
| to answer "has this resignation got past the equipment step" without a
| chain of comparisons at every call site.
|
| A rejection is resolved to the stage it was rejected at, so the tracker can
| show the journey stopping where it actually stopped rather than at the
| beginning.
*/

const STAGE_INDEX = RESIGNATION_STAGES.reduce(
  (map, stage, index) => {
    map[stage.status] = index;
    return map;
  },
  {
    [RESIGNATION_STATUS.MANAGER_REJECTED]: 0,
    [RESIGNATION_STATUS.HR_REJECTED]: 1,
  }
);

export const getStageIndex = (status) =>
  STAGE_INDEX[status] ?? -1;

/*
| Whether a resignation has moved past a given status. The equipment page,
| the settlement page and the certificate route all ask this before they let
| anybody in, so an address typed by hand cannot skip a step.
*/

export const hasReachedStage = (status, target) => {

  if (isRejectedStatus(status)) return false;

  return getStageIndex(status) >= getStageIndex(target);

};

/*
|--------------------------------------------------------------------------
| Status Colours
|--------------------------------------------------------------------------
| The same vocabulary the attendance and leave badges use: amber is waiting,
| emerald is done, red is refused. Blue marks the stages where the ball is in
| the company's court rather than an approver's, so an employee scanning
| their own tracker can tell "somebody is deciding" from "somebody is doing".
|--------------------------------------------------------------------------
*/

export const RESIGNATION_STATUS_BADGES = {
  [RESIGNATION_STATUS.MANAGER_PENDING]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  [RESIGNATION_STATUS.MANAGER_REJECTED]: "bg-red-50 text-red-700 ring-1 ring-red-200",
  [RESIGNATION_STATUS.HR_PENDING]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  [RESIGNATION_STATUS.HR_REJECTED]: "bg-red-50 text-red-700 ring-1 ring-red-200",
  [RESIGNATION_STATUS.EQUIPMENT_PENDING]: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  [RESIGNATION_STATUS.FNF_PENDING]: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  [RESIGNATION_STATUS.FNF_REVIEW]: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  [RESIGNATION_STATUS.FINANCE_PENDING]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  [RESIGNATION_STATUS.EXITED]: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export const RESIGNATION_STATUS_DOTS = {
  [RESIGNATION_STATUS.MANAGER_PENDING]: "bg-amber-500",
  [RESIGNATION_STATUS.MANAGER_REJECTED]: "bg-red-500",
  [RESIGNATION_STATUS.HR_PENDING]: "bg-amber-500",
  [RESIGNATION_STATUS.HR_REJECTED]: "bg-red-500",
  [RESIGNATION_STATUS.EQUIPMENT_PENDING]: "bg-blue-500",
  [RESIGNATION_STATUS.FNF_PENDING]: "bg-blue-500",
  [RESIGNATION_STATUS.FNF_REVIEW]: "bg-violet-500",
  [RESIGNATION_STATUS.FINANCE_PENDING]: "bg-amber-500",
  [RESIGNATION_STATUS.EXITED]: "bg-emerald-500",
};

export const FALLBACK_RESIGNATION_BADGE =
  "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

export const FALLBACK_RESIGNATION_DOT = "bg-slate-500";

/*
|--------------------------------------------------------------------------
| Equipment
|--------------------------------------------------------------------------
| What the company hands out and therefore has to get back.
|
| `key` is what is stored, `label` is what is shown. Storing the key means an
| item can be renamed on screen without rewriting every settled exit, and it
| is why the employee's answers survive a change of wording here.
|
| `identifierLabel` is the one thing worth recording beside "returned": a
| laptop has a serial, a SIM has a number, a mail account has an address.
| Without it a returned-items list says four yeses and identifies nothing.
|--------------------------------------------------------------------------
*/

export const EQUIPMENT_ITEMS = [
  {
    key: "simCard",
    label: "SIM Card",
    identifierLabel: "Mobile Number",
    placeholder: "e.g. 98765 43210",
  },
  {
    key: "mailId",
    label: "Company Mail ID",
    identifierLabel: "Email Address",
    placeholder: "e.g. name@company.com",
  },
  {
    key: "laptop",
    label: "Laptop",
    identifierLabel: "Serial / Asset Tag",
    placeholder: "e.g. DL-5420-8891",
  },
  {
    key: "mobile",
    label: "Mobile Phone",
    identifierLabel: "IMEI / Asset Tag",
    placeholder: "e.g. 3556 8109 4471 22",
  },
];

/*
| What an employee can say about one item.
|
| "Not Issued" is the important one. Without it, somebody who was never given
| a laptop has to either claim they returned one or leave the row blank, and
| a blank row is indistinguishable from one they forgot. Saying so explicitly
| is what lets the form insist every row is answered.
*/

export const EQUIPMENT_STATUS = {
  RETURNED: "Returned",
  PENDING: "Yet to Return",
  NOT_ISSUED: "Not Issued",
};

export const EQUIPMENT_STATUS_OPTIONS = [
  EQUIPMENT_STATUS.RETURNED,
  EQUIPMENT_STATUS.PENDING,
  EQUIPMENT_STATUS.NOT_ISSUED,
];

export const EQUIPMENT_STATUS_BADGES = {
  [EQUIPMENT_STATUS.RETURNED]: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  [EQUIPMENT_STATUS.PENDING]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  [EQUIPMENT_STATUS.NOT_ISSUED]: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

/*
|--------------------------------------------------------------------------
| Full & Final Settlement
|--------------------------------------------------------------------------
| The lines the settlement is made of, in the order they are shown.
|
| `salaryPayable` carries `derived: true`. It is worked out from the salary
| structure and the days actually worked in the final month, so the form
| offers it already filled and says where the figure came from - but it stays
| editable, because a final month is exactly where an arrear or a correction
| that no formula knows about turns up.
|--------------------------------------------------------------------------
*/

export const FNF_EARNING_FIELDS = [
  {
    name: "salaryPayable",
    label: "Salary Payable",
    hint: "Earned up to the last working day",
    derived: true,
  },
  {
    name: "otherEarnings",
    label: "Other Earnings",
    hint: "Arrears, incentives, reimbursements",
  },
];

export const FNF_DEDUCTION_FIELDS = [
  {
    name: "noticeRecovery",
    label: "Notice Recovery",
    hint: "Shortfall in the notice period served",
  },
  {
    name: "loan",
    label: "Loan",
    hint: "Outstanding company loan",
  },
  {
    name: "advance",
    label: "Advance",
    hint: "Salary or travel advance not yet adjusted",
  },
  {
    name: "assetRecovery",
    label: "Asset Recovery",
    hint: "Equipment not returned or returned damaged",
  },
  {
    name: "otherDeductions",
    label: "Other Deductions",
    hint: "Anything else being recovered",
  },
];

export const FNF_FIELDS = [
  ...FNF_EARNING_FIELDS,
  ...FNF_DEDUCTION_FIELDS,
];

/*
| Every settlement figure, at zero. Both the worksheet and the calculator
| start from this, so a field added above appears on the form and in the
| totals without either of them being told about it separately.
*/

export const getEmptyFnF = () =>
  FNF_FIELDS.reduce((values, field) => {
    values[field.name] = 0;
    return values;
  }, {});

/*
|--------------------------------------------------------------------------
| Reasons
|--------------------------------------------------------------------------
| Offered as a starting point rather than a closed list - the form keeps a
| free-text box beside these, because the reason somebody is leaving is not
| something a dropdown should be allowed to have the last word on.
|--------------------------------------------------------------------------
*/

export const RESIGNATION_REASONS = [
  "Better Career Opportunity",
  "Higher Studies",
  "Relocation",
  "Personal Reasons",
  "Health Reasons",
  "Work Environment",
  "Compensation",
  "Other",
];

/* The shortest reason the form will accept, in characters. */
export const MIN_REASON_LENGTH = 20;

/*
| The notice period a company expects, in days. A default rather than a rule:
| nothing in the app stores a per-company notice period yet, and this is what
| the resignation form offers as the earliest sensible last working day and
| what the settlement measures a shortfall against. HR can move the date on
| approval, which is what actually decides the recovery.
*/

export const DEFAULT_NOTICE_PERIOD_DAYS = 30;

/* The optional document the resignation form accepts, capped like the
   resume upload the employee details screen already does. */
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export const ACCEPTED_DOCUMENT_LABEL = "PDF, JPG or PNG · up to 5 MB";
