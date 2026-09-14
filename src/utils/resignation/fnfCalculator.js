import {
  FNF_DEDUCTION_FIELDS,
  FNF_EARNING_FIELDS,
  getEmptyFnF,
} from "./resignationConstants";

import {
  daysBetween,
  parseDate,
} from "./resignationUtils";

/*
|--------------------------------------------------------------------------
| Full & Final Calculator
|--------------------------------------------------------------------------
| What the company owes and what it takes back, worked out in one place.
|
| Two things happen here and they are kept apart on purpose:
|
|   `calculateSalaryPayable` derives the one figure a formula can know - the
|   part of the final month that was actually earned.
|
|   `calculateFnF` totals whatever is on the worksheet, derived or typed.
|
| Splitting them is what lets HR overwrite the derived figure without the
| totals stopping working, and it means the settlement is always the sum of
| what is on screen rather than of something recomputed behind it. A total
| that disagrees with the lines above it is the one thing a settlement must
| never do.
|
| Everything is rounded to whole rupees. A settlement is paid as one amount
| and printed on a certificate, so carrying paise through five lines only
| creates a total that is a rupee off what the lines add up to.
|--------------------------------------------------------------------------
*/

const round = (value) => Math.round(Number(value) || 0);

const toAmount = (value) => {

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;

};

/*
|--------------------------------------------------------------------------
| Gross From A Salary Structure
|--------------------------------------------------------------------------
| The monthly gross the pro-rating is measured against.
|
| Read off the stored structure's earnings rather than a `gross` field,
| because that is how `calculateSalary` prices a normal month and the final
| month has to be priced the same way. A settlement that used a different
| definition of gross would pay a leaver at a rate their payslips never
| showed.
|--------------------------------------------------------------------------
*/

export const getMonthlyGross = (salary) => {

  const earnings = salary?.earnings || {};

  return Object.values(earnings).reduce(
    (total, value) => total + toAmount(value),
    0
  );

};

/*
|--------------------------------------------------------------------------
| Salary Payable To The Last Working Day
|--------------------------------------------------------------------------
| The final month, pro-rated.
|
| Paid days over the days in that month, times the monthly gross. The
| denominator is the calendar length of the month the exit falls in - 28, 30
| or 31 - and not a fixed 30. A fixed denominator quietly overpays every
| February leaver and underpays every one who goes in a 31 day month, and
| over a company's history those do not cancel out.
|
| Weekly offs and declared holidays are not deducted. Somebody who works to
| the 20th is paid to the 20th including the Sundays inside that span,
| exactly as they would be in any other month - a leaver is not charged for
| the weekends they did not work any more than a joiner is.
|
| `asOf` is the last day the employee is on the books, so it is counted: a
| last working day of the 1st is one paid day, not zero.
|--------------------------------------------------------------------------
*/

export const calculateSalaryPayable = (salary, lastWorkingDay) => {

  const monthlyGross = getMonthlyGross(salary);

  const exitDate = parseDate(lastWorkingDay);

  if (!monthlyGross || !exitDate) {
    return {
      amount: 0,
      monthlyGross: round(monthlyGross),
      paidDays: 0,
      daysInMonth: 0,
      perDay: 0,
    };
  }

  /*
  | Day 0 of the following month is the last day of this one, which is how
  | the length of the month is found without a leap year table.
  */
  const daysInMonth = new Date(
    exitDate.getFullYear(),
    exitDate.getMonth() + 1,
    0
  ).getDate();

  const paidDays = exitDate.getDate();

  const perDay = monthlyGross / daysInMonth;

  return {
    amount: round(perDay * paidDays),
    monthlyGross: round(monthlyGross),
    paidDays,
    daysInMonth,
    perDay: round(perDay),
  };

};

/*
|--------------------------------------------------------------------------
| Notice Shortfall
|--------------------------------------------------------------------------
| How much of the notice period was not served, in days.
|
| Offered to HR as a note beside the Notice Recovery field rather than being
| filled into it. What a day of shortfall costs is a policy question - some
| companies recover basic, some recover gross, some waive it entirely - and
| this module has no policy to read. So it reports the gap and leaves the
| figure to the person who knows the answer.
|
| Never negative: somebody who serves longer than required has no shortfall,
| and a negative recovery would silently become a payment.
|--------------------------------------------------------------------------
*/

export const getNoticeShortfall = ({
  raisedOn,
  lastWorkingDay,
  noticePeriodDays,
}) => {

  const served = daysBetween(raisedOn, lastWorkingDay);

  const required = Number(noticePeriodDays) || 0;

  if (!served || !required) {
    return { served: Math.max(0, served), required, shortfallDays: 0 };
  }

  return {
    served,
    required,
    shortfallDays: Math.max(0, required - served),
  };

};

/*
|--------------------------------------------------------------------------
| The Settlement
|--------------------------------------------------------------------------
| Every line on the worksheet, added up.
|
| The field lists drive the totals, so a line added to `FNF_EARNING_FIELDS`
| is counted as an earning from the moment it appears on the form - there is
| no second list here that could be forgotten.
|
| `netPayable` is allowed to be negative. An exit where the recoveries exceed
| what is owed is a real outcome, and clamping it to zero would quietly
| forgive the difference; the worksheet says "recoverable from employee"
| instead of pretending the settlement is nil.
|--------------------------------------------------------------------------
*/

export const calculateFnF = (values = {}) => {

  const figures = { ...getEmptyFnF(), ...values };

  const totalEarnings = FNF_EARNING_FIELDS.reduce(
    (total, field) => total + toAmount(figures[field.name]),
    0
  );

  const totalDeductions = FNF_DEDUCTION_FIELDS.reduce(
    (total, field) => total + toAmount(figures[field.name]),
    0
  );

  const netPayable = totalEarnings - totalDeductions;

  return {
    totalEarnings: round(totalEarnings),
    totalDeductions: round(totalDeductions),
    netPayable: round(netPayable),
    isRecoverable: netPayable < 0,
  };

};

/*
| The worksheet HR is first shown: every line at zero except the one the app
| can work out for itself.
|
| An employee with no salary structure on record gets a worksheet of zeroes
| rather than a failure. That is a real case - somebody who left before a
| structure was ever assigned - and the settlement is still owed; HR types
| the figure in and the derived note beside it says why it could not be
| filled.
*/

export const buildInitialFnF = (salary, lastWorkingDay) => {

  const payable = calculateSalaryPayable(salary, lastWorkingDay);

  return {
    values: {
      ...getEmptyFnF(),
      salaryPayable: payable.amount,
    },
    derivation: payable,
  };

};
