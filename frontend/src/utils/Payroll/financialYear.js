import { getPayrollMonth, parsePayrollMonth } from "./payrollDate";

/*
|--------------------------------------------------------------------------
| Financial Years
|--------------------------------------------------------------------------
| Salary is looked at a year at a time, and the year an employee means is not
| the calendar one. A financial year runs from 1 April to 31 March, so
| "2026-27" is April 2026 through March 2027 - which is the year every tax
| statement, every CTC figure and every payslip archive is filed under.
|
| A financial year is identified by the calendar year it *starts* in, so it is
| a single number rather than a pair that could disagree with itself. `2026`
| means April 2026 to March 2027 everywhere below, and `formatFinancialYear`
| is the only thing that turns it back into the "FY 2026-27" a person reads.
|
| Everything here is built from local time and from the `YYYY-MM` payroll
| month, for the same reason `payrollDate` is: `toISOString()` converts to UTC
| first, which on the first and last day of a month rolls the month over - and
| in April or March that rolls the whole financial year over with it.
|--------------------------------------------------------------------------
*/

/* The 1 based calendar month a financial year opens on. */
export const FINANCIAL_YEAR_START_MONTH = 4;

export const MONTHS_IN_FINANCIAL_YEAR = 12;

/*
| How many years back the picker offers. Five covers the span anybody
| reasonably reaches for, and the options are trimmed again to the years the
| employee has actually been employed for - see `getFinancialYearOptions`.
*/
export const FINANCIAL_YEAR_OPTIONS = 5;

/*
| A `Date`, a `YYYY-MM-DD` date key or a `YYYY-MM` payroll month, read as a
| local date. The two keys are split by hand rather than handed to `Date`,
| which parses them as UTC midnight and can land on the day before.
*/

const toLocalDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const [year, month, day] = String(value || "").split("-").map(Number);

  if (year && month) return new Date(year, month - 1, day || 1);

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/*
| The financial year a date falls in. January to March belong to the year that
| opened the April before, which is the one thing this whole file exists to
| get right.
*/

export const getFinancialYear = (value = new Date()) => {
  const date = toLocalDate(value);

  if (!date) return 0;

  return date.getMonth() + 1 >= FINANCIAL_YEAR_START_MONTH
    ? date.getFullYear()
    : date.getFullYear() - 1;
};

export const getFinancialYearOfMonth = (payrollMonth) => {
  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) return 0;

  return parsed.month >= FINANCIAL_YEAR_START_MONTH
    ? parsed.year
    : parsed.year - 1;
};

/*
| Every payroll month of a financial year, April first through to March. In
| order, because this is what the year is read for: the summary sums it and
| the history table reverses it.
*/

export const getFinancialYearMonths = (financialYear) => {
  const year = Number(financialYear);

  if (!year) return [];

  return Array.from({ length: MONTHS_IN_FINANCIAL_YEAR }, (_, index) =>
    getPayrollMonth(
      new Date(year, FINANCIAL_YEAR_START_MONTH - 1 + index, 1)
    )
  ).filter(Boolean);
};

/*
| The two calendar years a financial year spans, which is what the year filter
| on the history table offers: a row is stamped 2026 or 2027, not "FY 2026-27".
*/

export const getFinancialYearCalendarYears = (financialYear) => {
  const year = Number(financialYear);

  return year ? [year, year + 1] : [];
};

export const formatFinancialYear = (financialYear) => {
  const year = Number(financialYear);

  if (!year) return "--";

  // "FY 2026-27" - the closing year abbreviated, the way it is always written.
  return `FY ${year}-${String((year + 1) % 100).padStart(2, "0")}`;
};

/*
| The years the picker offers, newest first.
|
| It never runs past the current financial year: a year that has not started
| has no payroll in it, and offering it would make an empty page look like
| missing data. `since` trims the other end to the year the employee joined,
| for the same reason - the years before they were hired are not empty, they
| are not theirs.
*/

export const getFinancialYearOptions = ({
  count = FINANCIAL_YEAR_OPTIONS,
  from = new Date(),
  since = "",
} = {}) => {
  const current = getFinancialYear(from);

  if (!current) return [];

  const earliest = since ? getFinancialYear(since) : 0;

  const years = [];

  for (let index = 0; index < count; index += 1) {
    const year = current - index;

    /*
    | Never trimmed to nothing. A joining date in the future - a joiner whose
    | record was created ahead of their start - would otherwise leave the
    | picker with no options at all and sitting on a blank, so the current
    | year is always offered whatever the date says.
    */
    if (earliest && year < earliest && years.length > 0) break;

    years.push({
      value: String(year),
      label: formatFinancialYear(year),
    });
  }

  return years;
};
