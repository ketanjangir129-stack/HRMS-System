import { getMonthlyAttendanceRecords } from "./attendanceService";
import { getHolidays } from "../holidayServices/holidayService";
import { getHolidayDates } from "../../utils/holiday/holidayUtils";
import {
  buildMonthlyAttendanceSummary,
  buildMonthlyAttendanceSummaries,
} from "../../utils/attendance/attendanceSummary";
import { getDateKey } from "../../utils/attendance/attendanceDate";

/*
|--------------------------------------------------------------------------
| Attendance Summary Service
|--------------------------------------------------------------------------
| Turns a month of the attendance tree into the summary payroll is priced
| from. It reads; `attendanceSummary` counts. Nothing here writes, because a
| summary is always derived: storing one would let it drift the moment a day
| of the month it describes is corrected.
|
| A month needs two reads and only two, however many employees it covers:
|
|   companies/{companyCode}/attendance/records/{year}/{Month}
|   companies/{companyCode}/holidays/{year}
|
| so `getMonthlyAttendanceSummaries` is what payroll for a whole company goes
| through. `getMonthlyAttendanceSummary` is the same two reads for one head,
| and is only worth calling when there is genuinely one employee to price.
|
| An unreachable holiday calendar is not allowed to stop a summary: it comes
| back empty and the month is summarised without declared holidays, which
| moves those days into `workingDays` rather than losing them.
|--------------------------------------------------------------------------
*/

const loadMonth = async (companyCode, year, month) => {

  const [monthRecords, holidays] = await Promise.all([

    getMonthlyAttendanceRecords(companyCode, year, month),

    getHolidays(companyCode, year).catch((error) => {

      console.error(
        "Failed to load holidays for the attendance summary:",
        error
      );

      return [];

    }),

  ]);

  return {
    monthRecords: monthRecords || {},
    holidayDates: getHolidayDates(holidays),
  };

};

/*
| One employee's month, summarised.
*/

export const getMonthlyAttendanceSummary = async (
  companyCode,
  employeeId,
  year,
  month,
  options = {}
) => {

  const { monthRecords, holidayDates } =
    await loadMonth(companyCode, year, month);

  return buildMonthlyAttendanceSummary({
    employeeId,
    year,
    month,
    monthRecords,
    holidayDates,
    today: getDateKey(),
    ...options,
  });

};

/*
| Every employee's month, keyed by employee id, out of the same two reads.
*/

export const getMonthlyAttendanceSummaries = async (
  companyCode,
  employeeIds = [],
  year,
  month,
  options = {}
) => {

  if (employeeIds.length === 0) return {};

  const { monthRecords, holidayDates } =
    await loadMonth(companyCode, year, month);

  return buildMonthlyAttendanceSummaries({
    employeeIds,
    year,
    month,
    monthRecords,
    holidayDates,
    today: getDateKey(),
    ...options,
  });

};
