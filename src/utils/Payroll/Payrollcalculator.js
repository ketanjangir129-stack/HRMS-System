import {
  HALF_DAY_LOP,
  OVERTIME_RATE_MULTIPLIER,
  roundHours,
  roundMoney,
} from "./payrollConstants";
import { WORK_RULES } from "../attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Payroll Calculator
|--------------------------------------------------------------------------
| Prices one employee's month: the salary structure they are on, plus the
| month of attendance they actually worked, becomes the amount they are paid.
|
| Nothing here reads or writes anything. The same function runs in the
| dashboard preview and in the service that stores the snapshot, so the number
| on screen is the number that was saved.
|
| The shape of the month:
|
|   grossSalary   the structure's monthly earnings, unchanged - it is what
|                 the employee is on, not what they are paid this month
|   perDaySalary  grossSalary / workingDays
|
| The divisor is the month's *working* days, not its calendar days. Holidays
| and weekly offs are paid days that nobody is expected in for, so they are
| neither earned nor deducted; dividing by calendar days instead would quietly
| under-price every day of loss of pay.
|
| A month with no working days at all - a future month, or one that is
| entirely holiday - prices at zero per day rather than dividing by zero, and
| the whole salary is paid.
|--------------------------------------------------------------------------
*/

const sum = (values = {}) =>
  Object.values(values).reduce(
    (total, value) => total + (Number(value) || 0),
    0
  );

/*
| The full working day, in hours, that an hourly rate is derived from.
*/

const HOURS_PER_DAY = WORK_RULES.fullDayMinutes / 60;

/*
| The days of the month that are not paid for.
|
| Absences and unpaid leave cost a full day each. A half day costs half of
| one: the other half was worked and is paid for.
|
| Paid leave, holidays and weekly offs are all absent from this on purpose.
| Late days are too - arriving late is an attendance matter, and deducting a
| day of pay for it is a policy this module does not assume.
*/

export const calculateLossOfPayDays = (summary = {}) =>
  (Number(summary.absent) || 0) +
  (Number(summary.unpaidLeave) || 0) +
  (Number(summary.halfDay) || 0) * HALF_DAY_LOP;

export const calculatePayroll = (
  salary,
  summary = {},
  { overtimeMultiplier = OVERTIME_RATE_MULTIPLIER } = {}
) => {

  const earnings = salary?.earnings || {};
  const deductions = salary?.deductions || {};

  /*
  | The totals are recomputed from the fields rather than trusted from the
  | salary record: an older record may have been written before a field
  | existed, and its stored total would then be short by that field.
  */

  const grossSalary = roundMoney(sum(earnings));

  const structureDeductions = roundMoney(sum(deductions));

  const workingDays = Number(summary.workingDays) || 0;

  const perDaySalary = workingDays
    ? roundMoney(grossSalary / workingDays)
    : 0;

  const perHourSalary = roundMoney(perDaySalary / HOURS_PER_DAY);

  const lopDays = calculateLossOfPayDays(summary);

  /*
  | Never more than the month is worth: a summary that somehow counts more
  | lost days than the month has would otherwise pay a negative salary.
  */

  const chargedLopDays = Math.min(lopDays, workingDays);

  const payableDays = roundHours(workingDays - chargedLopDays);

  const lopDeduction = roundMoney(perDaySalary * chargedLopDays);

  const overtimeHours = roundHours(summary.overtimeHours);

  const overtimeRate = roundMoney(perHourSalary * overtimeMultiplier);

  const overtimePay = roundMoney(overtimeHours * overtimeRate);

  const totalEarnings = roundMoney(grossSalary + overtimePay);

  const totalDeductions = roundMoney(structureDeductions + lopDeduction);

  return {

    // What the employee is on.
    grossSalary,
    perDaySalary,
    perHourSalary,

    // What the month cost them.
    workingDays,
    lopDays: roundHours(chargedLopDays),
    payableDays,
    lopDeduction,

    // What the month earned them on top.
    overtimeHours,
    overtimeRate,
    overtimePay,

    // The two sides, and what is left.
    totalEarnings,
    structureDeductions,
    totalDeductions,
    netPayable: roundMoney(totalEarnings - totalDeductions),

  };

};

/*
|--------------------------------------------------------------------------
| Payslip Lines
|--------------------------------------------------------------------------
| The calculation laid out the way a payslip prints it. Kept here rather than
| in the page so a stored snapshot and a live preview render identically, and
| so a zero valued line is dropped in exactly one place: a payslip that lists
| every allowance the form offers, most of them at nil, reads as though the
| employee is owed things they are not.
*/

export const buildPayslipEarnings = (payroll = {}, fieldLabels = []) => {

  const earnings = payroll?.salary?.earnings || {};

  const lines = fieldLabels
    .filter((field) => Number(earnings[field.name]) > 0)
    .map((field) => ({
      title: field.label,
      amount: roundMoney(earnings[field.name]),
    }));

  const overtimePay = Number(payroll?.calculation?.overtimePay) || 0;

  if (overtimePay > 0) {
    lines.push({
      title: `Overtime (${payroll.calculation.overtimeHours} hrs)`,
      amount: roundMoney(overtimePay),
    });
  }

  return lines;

};

export const buildPayslipDeductions = (payroll = {}, fieldLabels = []) => {

  const deductions = payroll?.salary?.deductions || {};

  const lines = fieldLabels
    .filter((field) => Number(deductions[field.name]) > 0)
    .map((field) => ({
      title: field.label,
      amount: roundMoney(deductions[field.name]),
    }));

  // const lopDeduction = Number(payroll?.calculation?.lopDeduction) || 0;

  // if (lopDeduction > 0) {
  //   lines.push({
  //     title: `Loss Of Pay (${payroll.calculation.lopDays} days)`,
  //     amount: roundMoney(lopDeduction),
  //   });
  // }

  return lines;

};

export default calculatePayroll;
