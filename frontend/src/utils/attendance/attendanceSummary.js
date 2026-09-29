import { ATTENDANCE_STATUS } from "./attendanceConstants";
import { DEFAULT_WORK_DAY_MINUTES } from "./attendanceSettings";
import {
  getDateKey,
  getMonthDateKeys,
} from "./attendanceDate";
import {
  formatWorkingMinutes,
  parseWorkingMinutes,
} from "./attendanceUtils";
import {
  isWeeklyOff,
  toHolidaySet,
} from "../holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Monthly Attendance Summary
|--------------------------------------------------------------------------
| One employee's month of attendance reduced to the counts payroll is priced
| from:
|
|   {
|     workingDays, present, paidLeave, unpaidLeave, absent,
|     late, halfDay, holiday, weeklyOff, overtimeHours
|   }
|
| This is deliberately not `buildMonthlyReport`. That one describes what was
| recorded - it counts only the days that have a record, so a month nobody
| punched in reports a 100% attendance rate over zero working days. Payroll
| has to describe what was *owed*: every day of the calendar is classified,
| and a working day with no record at all is an absence, because that is
| exactly what payroll has to deduct for.
|
| Every day of the month falls into exactly one of three groups:
|
|   holiday     a date the company declared closed
|   weeklyOff   a date the working week never covers
|   workingDays everything else - the days pay is divided across
|
| and every elapsed working day then falls into exactly one of present, late,
| halfDay, paidLeave, unpaidLeave or absent. So:
|
|   workingDays = present + late + halfDay + paidLeave + unpaidLeave
|               + absent + pendingDays
|
| `pendingDays` is what keeps that true for a month still in progress. A
| working day that has not happened yet is not an absence, but it is still a
| working day of the month, so it stays in the divisor and out of the
| deduction. Running payroll mid month therefore pays the full salary less
| the absences taken so far, instead of pro-rating the month down to the days
| that happen to have elapsed.
|--------------------------------------------------------------------------
*/

/*
| Paid or unpaid?
|
| A leave day booked by an approved request carries the id of that request,
| and the leave module refuses to approve a request the balance cannot cover.
| So a linked leave day has already been charged to the entitlement, and it is
| paid.
|
| A day HR typed in by hand as "Leave" carries no request, so nothing was
| charged against any balance - it is leave without pay. A company that would
| rather trust the manual mark passes `manualLeaveIsPaid`.
*/

const isPaidLeave = (record, manualLeaveIsPaid) =>
  Boolean(record?.leaveRequestId) || manualLeaveIsPaid;

/*
| Hours worked past a full day. Only whole minutes are counted, because that
| is all a punch pair records.
|
| Measured against the default working day rather than the company's configured
| one, deliberately. This number is priced by payroll, and overtime is a policy
| a company sets rather than something that follows from its office hours -
| moving the threshold with the configured end time would silently change what
| every already generated month was worth. Making overtime configurable is its
| own decision and its own setting; until it is taken, this stays exactly the
| threshold it has always been.
*/

const overtimeMinutesOf = (workedMinutes) =>
  Math.max(0, workedMinutes - DEFAULT_WORK_DAY_MINUTES);

export const buildMonthlyAttendanceSummary = ({
  employeeId,
  year,
  month,
  monthRecords = {},
  holidayDates = [],
  today = getDateKey(),
  manualLeaveIsPaid = false,
}) => {

  const summary = {
    workingDays: 0,
    present: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    holiday: 0,
    weeklyOff: 0,
    overtimeHours: 0,
    // Working days of the month that have not been reached yet.
    pendingDays: 0,
  };

  const dateKeys = getMonthDateKeys(year, month);

  if (!employeeId || dateKeys.length === 0) {
    return { ...summary, totalDays: 0, workedHours: "0h 0m" };
  }

  const holidays = toHolidaySet(holidayDates);

  let workedMinutes = 0;
  let overtimeMinutes = 0;

  dateKeys.forEach((date) => {

    /*
    | A holiday that lands on a weekly off is counted once, as a holiday, so
    | the two non working counts can be added up without overlapping.
    */

    if (holidays.has(date)) {
      summary.holiday++;
      return;
    }

    if (isWeeklyOff(date)) {
      summary.weeklyOff++;
      return;
    }

    summary.workingDays++;

    if (date > today) {
      summary.pendingDays++;
      return;
    }

    const record = monthRecords?.[date]?.[employeeId];

    // Nobody marked the day and it has passed, so it was not worked.
    if (!record) {
      summary.absent++;
      return;
    }

    const minutes = parseWorkingMinutes(record.workingHours);

    workedMinutes += minutes;
    overtimeMinutes += overtimeMinutesOf(minutes);

    switch (record.status) {

      case ATTENDANCE_STATUS.PRESENT:
        summary.present++;
        break;

      case ATTENDANCE_STATUS.LATE:
        summary.late++;
        break;

      case ATTENDANCE_STATUS.HALF_DAY:
        summary.halfDay++;
        break;

      case ATTENDANCE_STATUS.LEAVE:
        if (isPaidLeave(record, manualLeaveIsPaid)) {
          summary.paidLeave++;
        } else {
          summary.unpaidLeave++;
        }
        break;

      case ATTENDANCE_STATUS.ABSENT:
        summary.absent++;
        break;

      /*
      | A record written before the status was stored, or one whose status was
      | cleared. A punch in is still evidence the employee was there, so the
      | day is not deducted for; anything else is an absence.
      */
      default:
        if (record.punchIn) {
          summary.present++;
        } else {
          summary.absent++;
        }
        break;

    }

  });

  return {

    ...summary,

    overtimeHours:
      Math.round((overtimeMinutes / 60) * 100) / 100,

    totalDays: dateKeys.length,

    workedHours: formatWorkingMinutes(workedMinutes),

  };

};

/*
| The same summary for every employee of a month, keyed by employee id, out of
| the one month of records that has already been read. Payroll for a whole
| company is generated from a single fetch this way instead of one per head.
*/

export const buildMonthlyAttendanceSummaries = ({
  employeeIds = [],
  year,
  month,
  monthRecords = {},
  holidayDates = [],
  today = getDateKey(),
  manualLeaveIsPaid = false,
}) =>
  employeeIds.reduce((summaries, employeeId) => {

    summaries[employeeId] = buildMonthlyAttendanceSummary({
      employeeId,
      year,
      month,
      monthRecords,
      holidayDates,
      today,
      manualLeaveIsPaid,
    });

    return summaries;

  }, {});
