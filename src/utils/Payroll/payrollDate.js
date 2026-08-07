import { MONTHS } from "../attendance/attendanceConstants";
import {
  getDateKey,
  getMonthDateKeys,
} from "../attendance/attendanceDate";
import { PAYSLIP_MONTHS } from "./payrollConstants";

/*
|--------------------------------------------------------------------------
| Payroll Months
|--------------------------------------------------------------------------
| A payroll month is the `YYYY-MM` value the month picker produces, and it is
| also the node a month of payroll is filed under:
|
|   companies/{companyCode}/payroll/{YYYY-MM}/{employeeId}
|
| Everything here is built from local time. `toISOString()` converts to UTC
| first, so on the first and the last day of a month it rolls the month over
| and payroll would be written under the wrong node.
|--------------------------------------------------------------------------
*/

const PAYROLL_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const getPayrollMonth = (value = new Date()) => {

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  return `${date.getFullYear()}-${month}`;

};

/*
| A payroll month split into the year and the 1 based month number the
| attendance and holiday reads count in. A value that is not a payroll month
| returns nothing, so a bad month is caught by the caller instead of building
| a path out of rubbish.
*/

export const parsePayrollMonth = (payrollMonth) => {

  const value = String(payrollMonth || "");

  if (!PAYROLL_MONTH_PATTERN.test(value)) return null;

  const [year, month] = value.split("-").map(Number);

  if (!year || month < 1 || month > 12) return null;

  return { year, month };

};

export const isPayrollMonth = (payrollMonth) =>
  Boolean(parsePayrollMonth(payrollMonth));

/*
| Moves a payroll month by a number of months, forwards or backwards.
*/

export const shiftPayrollMonth = (payrollMonth, offset) => {

  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) return "";

  return getPayrollMonth(
    new Date(parsed.year, parsed.month - 1 + offset, 1)
  );

};

/*
| The payroll month and the ones before it, newest first. This is what the
| payslip page offers: the last three months of pay, and nothing older.
*/

export const getRecentPayrollMonths = (
  payrollMonth,
  count = PAYSLIP_MONTHS
) => {

  if (!isPayrollMonth(payrollMonth)) return [];

  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    shiftPayrollMonth(payrollMonth, -index)
  ).filter(Boolean);

};

/*
|--------------------------------------------------------------------------
| Pay Period
|--------------------------------------------------------------------------
| A payroll month is paid for in full, so the period is the whole calendar
| month and the pay day is its last date. Both are derived rather than
| stored, so they can never disagree with the month the snapshot lives in.
*/

export const getPayPeriod = (payrollMonth) => {

  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) {
    return { fromDate: "", toDate: "", payDate: "" };
  }

  const dateKeys = getMonthDateKeys(parsed.year, parsed.month);

  const fromDate = dateKeys[0] || "";
  const toDate = dateKeys[dateKeys.length - 1] || "";

  return {
    fromDate,
    toDate,
    // Salary is released on the last working date of the month it covers.
    payDate: toDate,
  };

};

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

export const formatPayrollMonth = (payrollMonth) => {

  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) return "--";

  return `${MONTHS[parsed.month - 1]} ${parsed.year}`;

};

/*
| "01 Aug 2026 - 31 Aug 2026", the line the payslip prints as its pay period.
*/

export const formatPayPeriod = (payrollMonth) => {

  const { fromDate, toDate } = getPayPeriod(payrollMonth);

  if (!fromDate || !toDate) return "--";

  return `${formatPayrollDate(fromDate)} - ${formatPayrollDate(toDate)}`;

};

export const formatPayrollDate = (dateKey) => {

  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map(Number);

  if (!year || !month || !day) return "--";

  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1].slice(0, 3)} ${year}`;

};

/*
| A payroll month cannot be run before it has started, which is what the
| dashboard checks before it offers to generate one.
*/

export const isFuturePayrollMonth = (payrollMonth) => {

  const { fromDate } = getPayPeriod(payrollMonth);

  return Boolean(fromDate) && fromDate > getDateKey();

};
