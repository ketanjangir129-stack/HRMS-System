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
| Payroll Status
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
| The dashboard also has to name the state a payroll is in before it exists,
| and that is not a stored status: an employee with no snapshot for the month
| is pending. It is kept next to the stored ones so every pill on the page is
| coloured out of the same map.
*/

export const PAYROLL_PENDING = "Pending";

export const PAYROLL_STATUS_BADGES = {
  [PAYROLL_STATUS.GENERATED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PAYROLL_STATUS.PAID]: "bg-blue-50 text-blue-700 ring-blue-200",
  [PAYROLL_PENDING]: "bg-amber-50 text-amber-700 ring-amber-200",
};

export const PAYROLL_STATUS_DOTS = {
  [PAYROLL_STATUS.GENERATED]: "bg-emerald-500",
  [PAYROLL_STATUS.PAID]: "bg-blue-500",
  [PAYROLL_PENDING]: "bg-amber-500",
};

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
