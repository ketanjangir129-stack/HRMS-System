import { PAYROLL_STATUS, roundMoney } from "./payrollConstants";
import { canViewPayslip } from "./payrollRun";
import {
  formatPayrollMonth,
  getPayPeriod,
  parsePayrollMonth,
} from "./payrollDate";
import { MONTHS_IN_FINANCIAL_YEAR } from "./financialYear";

/*
|--------------------------------------------------------------------------
| My Payroll
|--------------------------------------------------------------------------
| One employee's own view of a financial year, folded out of the payroll
| snapshots they already have.
|
| Nothing here reads anything and nothing here re-prices a month. Every figure
| is taken from `calculation` exactly as it was stored, so what the year adds
| up to is what the payslips say - a salary revised in March cannot quietly
| restate what was paid in June.
|
| The three figures a month is read by are the three a payslip prints, and
| they are the ones that balance:
|
|   totalEarnings - totalDeductions = netPayable
|
| `grossSalary` is deliberately not one of them. It is the structure's monthly
| earnings rather than what the month came to, so a year summed on it would
| ignore both overtime and loss of pay and would not equal the net beside it.
| It has exactly one job here, and that is pricing the annual CTC.
|--------------------------------------------------------------------------
*/

const read = (record, field) =>
  Number(record?.calculation?.[field]) || 0;

const sumOf = (records, field) =>
  roundMoney(
    records.reduce((total, record) => total + read(record, field), 0)
  );

/*
| Whether this employee may open this month's payslip, and why not when they
| may not.
|
| Two separate questions, answered in one place and in this order. The
| permission is asked first and reported on its own: somebody the owner has
| not given payslips to should be told that, not "the month is not locked yet"
| - the second reads as though the button will work once payroll closes the
| month, and for them it never will.
*/

const gateDownload = (record, { isOperator = false, canDownload = true } = {}) =>
  canDownload
    ? canViewPayslip(record?.run, isOperator)
    : {
        allowed: false,
        reason: "You do not have permission to download payslips.",
      };

/*
| One row of the history table, and the same shape the month card at the top
| of the page reads from.
|
| `release` is carried on the row rather than worked out at the button, so the
| table, the phone card and the month card can never disagree about whether a
| payslip is available or about the reason it is not.
*/

export const buildMyPayrollRow = (record, options = {}) => {
  const payrollMonth = record?.payrollMonth || "";

  const parsed = parsePayrollMonth(payrollMonth);

  return {
    payrollMonth,

    monthLabel: formatPayrollMonth(payrollMonth),

    /*
    | The calendar year the month sits in, which is what the year filter
    | offers: a financial year spans two of them, and a row is stamped 2026 or
    | 2027 rather than "FY 2026-27".
    */
    calendarYear: parsed ? String(parsed.year) : "",

    gross: read(record, "totalEarnings"),
    deductions: read(record, "totalDeductions"),
    netPay: read(record, "netPayable"),

    /*
    | The stored pay date, falling back to the one the month derives. An old
    | snapshot written before the pay period was stored has none of its own,
    | and the period is derived from the month either way - so the fallback is
    | the same date the record would have carried.
    */
    payDate:
      record?.payPeriod?.payDate || getPayPeriod(payrollMonth).payDate,

    status: record?.status || PAYROLL_STATUS.GENERATED,

    release: gateDownload(record, options),
  };
};

export const buildMyPayrollRows = (records = [], options = {}) =>
  records.map((record) => buildMyPayrollRow(record, options));

/*
|--------------------------------------------------------------------------
| The Year
|--------------------------------------------------------------------------
| What the financial year came to, and what the employee is on.
|
| The three totals cover only the months that were actually generated, and
| `payslipCount` says how many that was, so a year three months old reports
| three months of pay rather than looking like a year that came up short.
|
| The annual CTC is the one figure that is not a sum. It is the monthly
| structure multiplied out, because CTC is what the employee is *on* for the
| year rather than what has been paid so far - summing the months would report
| a June salary as a third of the package.
|
| The structure is taken from the newest snapshot of the year being viewed,
| not from the employee's current one. A snapshot carries the structure as it
| stood when the month was run, so a year that closed before a revision keeps
| reporting the CTC that year was actually on. The live structure is only the
| fallback, for a year with no payroll in it at all.
*/

export const buildMyPayrollSummary = (records = [], salary = null) => {
  const grossEarnings = sumOf(records, "totalEarnings");
  const totalDeductions = sumOf(records, "totalDeductions");
  const netSalary = sumOf(records, "netPayable");

  const structureGross = roundMoney(
    Object.values(salary?.earnings || {}).reduce(
      (total, value) => total + (Number(value) || 0),
      0
    )
  );

  const monthlyGross = records.length
    ? read(records[0], "grossSalary")
    : structureGross;

  return {
    payslipCount: records.length,
    grossEarnings,
    totalDeductions,
    netSalary,
    monthlyGross,
    annualCtc: roundMoney(monthlyGross * MONTHS_IN_FINANCIAL_YEAR),
  };
};

/*
| The statuses a month of an employee's own payroll can be in. Built from the
| stored ones rather than written out again, so a status added to the module
| appears in the filter without being listed twice.
*/

export const MY_PAYROLL_STATUS_FILTERS = Object.values(PAYROLL_STATUS).map(
  (status) => ({ value: status, label: status })
);
