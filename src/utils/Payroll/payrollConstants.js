/*
|--------------------------------------------------------------------------
| Payroll Constants
|--------------------------------------------------------------------------
| Single source of truth for every rule the payroll module applies. The
| calculator reads them, the services pass them through and the pages only
| render what comes back, so a policy is changed in one place.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Storage
|--------------------------------------------------------------------------
| The payroll branch is split in two, and every path in the service is built
| from these two names:
|
|   companies/{code}/payroll/runs/{YYYY-MM}
|   companies/{code}/payroll/records/{YYYY-MM}/{employeeId}
|
| A *run* is the month itself - who ran it, what it came to in total, and
| where it has got to in the generate, approve, lock sequence. A *record* is
| one employee's payslip inside that month.
|
| They are separated because they are read at completely different times. The
| dashboard header and any month level report want the run and nothing else,
| and reading the old combined node meant pulling every employee's payslip
| down to show a total that was already known. The run also has to exist as a
| thing in its own right: a month is approved and locked once, not once per
| employee, and there was nowhere to record that when the month was only ever
| the sum of its records.
*/

export const PAYROLL_RUNS_NODE = "runs";

export const PAYROLL_RECORDS_NODE = "records";

/*
|--------------------------------------------------------------------------
| Employee Payroll Status
|--------------------------------------------------------------------------
| A month is either generated for an employee or it is not. The status lives
| on the snapshot rather than being derived from its existence, so a payroll
| that is later marked paid has somewhere to say so.
*/

export const PAYROLL_STATUS = {
  GENERATED: "Generated",
  PAID: "Paid",
};

/*
|--------------------------------------------------------------------------
| Run Status
|--------------------------------------------------------------------------
| Where the month has got to. The three states are a sequence, never a set:
|
|   Generated   the figures exist and may still be re-run
|   Approved    the figures have been signed off, and re-running is refused
|   Locked      the month is final and nothing may touch it again
|
| Approve and lock are two steps rather than one because they answer two
| different questions. Approval says the numbers were checked; locking says
| the money left the building. Collapsing them would mean the only way to
| correct a mistake found after sign off was to unlock a paid month.
*/

export const PAYROLL_RUN_STATUS = {
  GENERATED: "Generated",
  APPROVED: "Approved",
  LOCKED: "Locked",
};

/*
| The dashboard also has to name the state a payroll is in before it exists,
| and that is not a stored status: a month with no run, or an employee with no
| snapshot inside one, is pending. It is kept next to the stored ones so every
| pill on the page is coloured out of the same map.
*/

export const PAYROLL_PENDING = "Pending";

export const PAYROLL_STATUS_BADGES = {
  [PAYROLL_STATUS.GENERATED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PAYROLL_STATUS.PAID]: "bg-blue-50 text-blue-700 ring-blue-200",
  [PAYROLL_RUN_STATUS.APPROVED]: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  [PAYROLL_RUN_STATUS.LOCKED]: "bg-slate-100 text-slate-700 ring-slate-300",
  [PAYROLL_PENDING]: "bg-amber-50 text-amber-700 ring-amber-200",
};

export const PAYROLL_STATUS_DOTS = {
  [PAYROLL_STATUS.GENERATED]: "bg-emerald-500",
  [PAYROLL_STATUS.PAID]: "bg-blue-500",
  [PAYROLL_RUN_STATUS.APPROVED]: "bg-indigo-500",
  [PAYROLL_RUN_STATUS.LOCKED]: "bg-slate-500",
  [PAYROLL_PENDING]: "bg-amber-500",
};

/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
| The three actions the owner can hand out separately, named here so the
| dashboard, the buttons and the registry all spell them the same way. The
| definitions themselves live in the permission registry.
*/

export const PAYROLL_PERMISSION = {
  GENERATE: "payroll.generate",
  APPROVE: "payroll.approve",
  LOCK: "payroll.lock",
};

/*
| Holding any one of the three is what makes somebody a payroll operator
| rather than a person being paid, and that is the line a payslip is released
| across: an operator has to read a month before it is closed in order to
| decide whether to close it, and everybody else waits for the lock.
|
| It is derived from the three actions rather than declared as a fourth
| permission, because a fourth would be a switch an owner could set to
| contradict them - somebody able to approve a month but not to look at it.
*/

export const PAYROLL_RUN_PERMISSIONS = [
  PAYROLL_PERMISSION.GENERATE,
  PAYROLL_PERMISSION.APPROVE,
  PAYROLL_PERMISSION.LOCK,
];

/*
| The dashboard filter is asked in the terms the page shows: a row is either
| generated for the month or it is still waiting to be.
*/

export const PAYROLL_STATUS_FILTERS = [
  { value: "generated", label: "Generated" },
  { value: "pending", label: "Pending" },
];

export const PAYROLL_PAGE_SIZE = 8;

/*
|--------------------------------------------------------------------------
| Loss Of Pay
|--------------------------------------------------------------------------
| The days a month is not paid for. Absences and unpaid leave cost a full
| day; a half day costs half of one.
|
| Declared holidays and weekly offs never appear here: they are not working
| days, so they were never part of the divisor either.
*/

export const HALF_DAY_LOP = 0.5;

/*
|--------------------------------------------------------------------------
| Overtime
|--------------------------------------------------------------------------
| Overtime is paid at the employee's own hourly rate multiplied by this
| factor. It is 1 by default - the plain hourly rate - so a company that pays
| a statutory 2x raises it here instead of in the calculator.
*/

export const OVERTIME_RATE_MULTIPLIER = 1;

/*
|--------------------------------------------------------------------------
| Payslips
|--------------------------------------------------------------------------
| How many months back a payslip may be pulled. The payslip page offers the
| payroll month and the two before it.
*/

export const PAYSLIP_MONTHS = 3;

/*
|--------------------------------------------------------------------------
| Rounding
|--------------------------------------------------------------------------
| Every money figure on a payroll snapshot is rounded to paise before it is
| stored, so the payslip renders the same number the calculation produced
| instead of a float that drifts in the last decimal place.
*/

export const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const roundHours = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;
