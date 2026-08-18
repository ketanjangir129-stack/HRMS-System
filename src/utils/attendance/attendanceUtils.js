import {
    APPROVAL_STATUS,
    ATTENDANCE_STATUS,
    WORK_RULES,
} from "./attendanceConstants";
import { getDateKey } from "./attendanceDate";
import {
    getDayName,
    isWeeklyOff,
} from "../holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Attendance Calculations
|--------------------------------------------------------------------------
| Every attendance number the UI shows is derived here. Components and hooks
| only pass data in and render what comes back, so the same rule is never
| implemented twice.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Working Hours
|--------------------------------------------------------------------------
| Stored as a "9h 15m" string, so both directions are needed.
*/

export const parseWorkingMinutes = (value = "") => {

    const match = String(value).match(/(\d+)h\s*(\d+)m/);

    if (!match) return 0;

    return Number(match[1]) * 60 + Number(match[2]);

};

export const formatWorkingMinutes = (minutes = 0) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export const calculateWorkingHours = (punchIn, punchOut) => {

    if (!punchIn || !punchOut) return "";

    const diff = punchOut - punchIn;

    // A punch out that is not after the punch in cannot produce real hours.
    if (diff <= 0) return "";

    return formatWorkingMinutes(Math.floor(diff / (1000 * 60)));

};

/*
|--------------------------------------------------------------------------
| Punch In Status
|--------------------------------------------------------------------------
| Anything past the working day start plus the grace period is Late.
*/

export const resolvePunchInStatus = (punchIn) => {

    const [hours, minutes] = String(WORK_RULES.startTime)
        .split(":")
        .map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return ATTENDANCE_STATUS.PRESENT;
    }

    const cutoff = new Date(punchIn);

    cutoff.setHours(
        hours,
        minutes + WORK_RULES.graceMinutes,
        0,
        0
    );

    return new Date(punchIn) > cutoff
        ? ATTENDANCE_STATUS.LATE
        : ATTENDANCE_STATUS.PRESENT;

};

/*
| The statuses that describe a day nobody was expected in. Neither is ever
| stored on a record - both are derived for a day that has none - so on the
| company wide views, where a row is an employee rather than a day, no row can
| carry one and the total is the roster exactly as before.
|
| On an employee's own month a row is a day, and these are the days that are
| left out of the total: dividing a month's attendance by its Sundays reports
| somebody who never missed a day as four fifths present.
*/

const NON_WORKING_STATUSES = [
    ATTENDANCE_STATUS.HOLIDAY,
    ATTENDANCE_STATUS.WEEKLY_OFF,
];

/*
|--------------------------------------------------------------------------
| Daily Approval
|--------------------------------------------------------------------------
| A day of attendance only counts once HR or the owner has signed it off. The
| three helpers below are the only place that reads the decision, so every
| table, card and total agrees on what a day is worth.
|
| A record written before daily approval existed carries no approval field at
| all, and is read as Approved rather than Pending. Nobody ever held it back:
| reading it as Pending would empty every month already on record and drop
| every rate reported so far to zero, over days that were never in question.
|
| Everything written since says what it is, so only history is grandfathered
| in. Flipping the fallback to `PENDING` makes the whole archive reviewable
| if that is ever wanted.
|--------------------------------------------------------------------------
*/

export const getApprovalStatus = (record) =>
    record?.approvalStatus || APPROVAL_STATUS.APPROVED;

export const isApproved = (record) =>
    getApprovalStatus(record) === APPROVAL_STATUS.APPROVED;

export const isPendingApproval = (record) =>
    getApprovalStatus(record) === APPROVAL_STATUS.PENDING;

export const isRejected = (record) =>
    getApprovalStatus(record) === APPROVAL_STATUS.REJECTED;

/*
| What an approval column shows, which is not always what the maths uses. A
| day that was never recorded at all - a holiday, a weekly off, an absence
| derived from a missing record - has no decision to show and gets nothing,
| so the column does not invent one for a day nobody ever reviewed.
|
| A record from before daily approval existed shows Approved, because that is
| exactly how it is being counted.
*/

export const getApprovalLabel = (record) =>
    record?.approvalStatus ||
    (record?.punchIn ? APPROVAL_STATUS.APPROVED : "");

/*
| The records of a day still waiting on a decision. Days nobody was expected
| in are left out: a holiday or a weekly off is not a day anybody has to sign
| off, and offering it for approval would put the whole roster in the queue
| every Sunday.
*/

export const getPendingApprovals = (records = []) =>
    records.filter(
        (record) =>
            isPendingApproval(record) &&
            !NON_WORKING_STATUSES.includes(record.status)
    );

/*
|--------------------------------------------------------------------------
| Manual Attendance Validation
|--------------------------------------------------------------------------
| Returns a `{ field: message }` map so the form can render errors inline.
| Absent and Leave are recorded without punch times.
*/

export const isTimeOptionalStatus = (status) =>
    status === ATTENDANCE_STATUS.ABSENT ||
    status === ATTENDANCE_STATUS.LEAVE;

export const validateAttendanceForm = (form = {}) => {

    const errors = {};

    if (!form.employeeId?.trim()) {
        errors.employeeId = "Please select an employee.";
    }

    if (!form.date) {
        errors.date = "Please select a date.";
    } else if (form.date > getDateKey()) {
        errors.date = "Attendance cannot be marked for a future date.";
    }

    if (!form.punchIn && !isTimeOptionalStatus(form.status)) {
        errors.punchIn = "Punch in time is required.";
    }

    if (
        form.punchIn &&
        form.punchOut &&
        form.punchOut <= form.punchIn
    ) {
        errors.punchOut = "Punch out time must be after punch in time.";
    }

    return errors;

};

/*
|--------------------------------------------------------------------------
| Employee Directory
|--------------------------------------------------------------------------
| Attendance records store nothing but the employee id, so names, departments
| and designations are always resolved from the employees collection through
| this lookup map.
*/

export const buildEmployeeDirectory = (employees = {}) => {

    const directory = {};

    Object.entries(employees).forEach(([key, employee]) => {

        const employeeId =
            employee?.employmentInfo?.employeeId || key;

        directory[employeeId] = {

            employeeId,

            name:
                employee?.personalInfo?.name ||
                employee?.employmentInfo?.name ||
                "",

            department:
                employee?.employmentInfo?.department || "",

            designation:
                employee?.employmentInfo?.designation || "",

            email:
                employee?.personalInfo?.email || "",

            role: employee?.account?.role || "",

            isActive: employee?.account?.status === "Active",

        };

    });

    return directory;

};

/*
| Falls back to the id itself so a record for a deleted employee still renders
| instead of showing an empty row.
*/

export const getEmployeeDetails = (directory = {}, employeeId = "") =>
    directory[employeeId] || {
        employeeId,
        name: employeeId,
        department: "",
        designation: "",
        email: "",
        role: "",
        isActive: false,
    };

/*
| Joins records with the directory. Used everywhere a record has to be shown
| with the employee it belongs to.
*/

export const attachEmployeeDetails = (records = [], directory = {}) =>
    records.map((record) => {

        const employee = getEmployeeDetails(
            directory,
            record.employeeId
        );

        return {
            ...record,
            employeeName: employee.name,
            department: employee.department,
            designation: employee.designation,
        };

    });

export const getActiveEmployees = (directory = {}) =>
    Object.values(directory).filter((employee) => employee.isActive);

export const getDepartments = (directory = {}) =>
    [
        ...new Set(
            Object.values(directory)
                .map((employee) => employee.department)
                .filter(Boolean)
        ),
    ].sort();

export const getInitials = (name = "") =>
    String(name)
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

/*
|--------------------------------------------------------------------------
| Attendance Summary
|--------------------------------------------------------------------------
| `totalEmployees` is the active employee roster. Attendance records only exist
| for people who were actually marked, so without the roster the denominator is
| just "everyone who showed up" and the present rate is always ~100%. When it is
| omitted the record based counting is kept.
*/

export const getAttendanceSummary = (
    attendance = [],
    totalEmployees = null,
    { isNonWorkingDay = false } = {}
) => {

    const summary = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfDay: 0,
        pending: 0,
        total: attendance.filter(
            (employee) =>
                !NON_WORKING_STATUSES.includes(employee.status)
        ).length,
        isNonWorkingDay,
    };

    attendance.forEach((employee) => {

        /*
        | A day nobody has signed off is not attendance yet, whatever its
        | punch times say it was. It is counted once, as Pending, and left out
        | of Present, Late and Half Day until HR decides: counting it as
        | attendance would make the approval an empty gesture, since the day
        | would already have been credited before anybody looked at it.
        */

        if (isPendingApproval(employee)) {

            if (!NON_WORKING_STATUSES.includes(employee.status)) {
                summary.pending++;
            }

            return;

        }

        /*
        | A day that was reviewed and turned down is an absence. The punch is
        | still on the record and still visible, but it buys no time until the
        | employee raises a correction and that correction is approved.
        */

        if (isRejected(employee)) {
            summary.absent++;
            return;
        }

        switch (employee.status) {

            case ATTENDANCE_STATUS.PRESENT:
                summary.present++;
                break;

            case ATTENDANCE_STATUS.LATE:
                summary.late++;
                break;

            case ATTENDANCE_STATUS.ABSENT:
                summary.absent++;
                break;

            case ATTENDANCE_STATUS.LEAVE:
                summary.leave++;
                break;

            case ATTENDANCE_STATUS.HALF_DAY:
                summary.halfDay++;
                break;

            default:
                break;

        }

    });

    /*
    | Anyone on the roster without a record for the day is absent, which also
    | covers records explicitly marked Absent. Half days are attendance, so
    | they are excluded from that count the same way the other statuses are.
    |
    | Days waiting on approval are excluded too, and for the opposite reason:
    | somebody with a punch in nobody has signed off yet has not been marked
    | absent, they have not been marked anything. Leaving them in the
    | subtraction would report the whole morning as absent until HR works
    | through the list, and every rejected day is already counted above.
    |
    | On a day nobody was expected in - a declared holiday or a weekly off -
    | that rule is dropped: the office was closed, so a day with no record is
    | not an absence and the roster is not turned into one. Records that do
    | exist are still counted, because somebody who came in was present.
    */
    if (
        typeof totalEmployees === "number" &&
        totalEmployees > 0
    ) {

        summary.total = totalEmployees;

        if (!isNonWorkingDay) {

            summary.absent = Math.max(
                totalEmployees -
                summary.present -
                summary.late -
                summary.leave -
                summary.halfDay -
                summary.pending,
                0
            );

        }

    }

    const percentage = (value) => {

        if (summary.total === 0) return 0;

        return Math.round((value / summary.total) * 100);

    };

    return {

        ...summary,

        presentPercentage: percentage(summary.present),

        absentPercentage: percentage(summary.absent),

        latePercentage: percentage(summary.late),

        leavePercentage: percentage(summary.leave),

        pendingPercentage: percentage(summary.pending),

        /*
        | Only the days that were actually signed off. The rate is what the
        | company can stand behind, so a morning of unreviewed punches reads
        | as a low rate with a pending count next to it explaining why, rather
        | than as a full day of attendance nobody has checked.
        */
        presentRate: percentage(
            summary.present + summary.late + summary.halfDay
        ),

    };

};

/*
|--------------------------------------------------------------------------
| Average Punch In
|--------------------------------------------------------------------------
| Punch in timestamps fall on different days once a month is analysed, so only
| the time of day is averaged instead of the raw timestamps.
*/

const averagePunchInTime = (punchIns = []) => {

    if (!punchIns.length) return "--";

    const totalMinutes = punchIns.reduce((total, punchIn) => {

        const date = new Date(punchIn);

        return total + date.getHours() * 60 + date.getMinutes();

    }, 0);

    const average = Math.round(totalMinutes / punchIns.length);

    const date = new Date();

    date.setHours(Math.floor(average / 60), average % 60, 0, 0);

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });

};

/*
|--------------------------------------------------------------------------
| Attendance Analytics
|--------------------------------------------------------------------------
*/

export const getAttendanceAnalytics = (
    attendance = [],
    totalEmployees = null,
    options = {}
) => {

    const summary = getAttendanceSummary(
        attendance,
        totalEmployees,
        options
    );

    const punchIns = attendance
        .filter((employee) => employee.punchIn)
        .map((employee) => employee.punchIn);

    const workingMinutes = attendance
        .filter((employee) => employee.workingHours)
        .map((employee) => parseWorkingMinutes(employee.workingHours));

    const averageMinutes =
        workingMinutes.length === 0
            ? 0
            : Math.round(
                workingMinutes.reduce((a, b) => a + b, 0) /
                workingMinutes.length
            );

    /*
    | Read off the summary rather than counted again here, so a late day
    | waiting on approval is not reported as late by one panel and as pending
    | by the one beside it.
    |
    | The two averages above are deliberately left over every record with a
    | punch time, approved or not: what time people arrived and how long they
    | stayed is a fact about the day, not a claim that needs signing off.
    */
    const lateEmployees = summary.late;

    return {

        presentRate: summary.presentRate,

        presentEmployees: summary.present,

        pendingApprovals: summary.pending,

        averagePunchIn: averagePunchInTime(punchIns),

        averageWorkingHours: formatWorkingMinutes(averageMinutes),

        lateEmployees,

        workingHoursProgress: Math.min(
            (averageMinutes / WORK_RULES.fullDayMinutes) * 100,
            100
        ),

        lateRate:
            summary.total === 0
                ? 0
                : Math.round((lateEmployees / summary.total) * 100),

    };

};

/*
|--------------------------------------------------------------------------
| Attendance Activities
|--------------------------------------------------------------------------
| Expects records already joined with the directory, so the feed can show who
| punched in without the record storing a name.
*/

export const getAttendanceActivities = (attendance = []) => {

    const activities = [];

    attendance.forEach((employee) => {

        const isLate = employee.status === ATTENDANCE_STATUS.LATE;

        if (employee.punchIn) {

            activities.push({

                id: `${employee.employeeId}-in`,

                employee: employee.employeeName || employee.employeeId,

                title: isLate ? "Punched In Late" : "Punched In",

                description: isLate
                    ? "Late attendance recorded."
                    : "Attendance marked successfully.",

                type: isLate ? "late" : "punchin",

                time: employee.punchIn,

            });

        }

        if (employee.punchOut) {

            activities.push({

                id: `${employee.employeeId}-out`,

                employee: employee.employeeName || employee.employeeId,

                title: "Punched Out",

                description: "Working hours calculated.",

                type: "punchout",

                time: employee.punchOut,

            });

        }

    });

    return activities.sort((a, b) => b.time - a.time);

};

/*
|--------------------------------------------------------------------------
| Calendar Data
|--------------------------------------------------------------------------
*/

/*
| `holidayDates` marks the days the office was closed. A holiday the employee
| worked anyway still shows the record: the tile only falls back to "holiday"
| when there is nothing else to show for the day, which is the same rule the
| reports use.
|
| A day still waiting on a decision keeps the colour of what it was and is
| marked with a second class rather than replaced by one: the approval is not
| a status, it is a note on top of one, and a day drawn only as Pending would
| no longer say whether it was a present day or a late one.
*/

export const getAttendanceCalendar = (
    history = [],
    holidayDates = []
) => {

    const calendar = {};

    holidayDates.forEach((date) => {

        if (!date) return;

        calendar[date] = "holiday";

    });

    history.forEach((record) => {

        if (!record?.date || !record?.status) return;

        const status = String(record.status).toLowerCase();

        calendar[record.date] = isPendingApproval(record)
            ? `${status} pending`
            : status;

    });

    return calendar;

};

/*
|--------------------------------------------------------------------------
| Daily Report
|--------------------------------------------------------------------------
| One row per record for the selected day, joined with the employee details.
*/

export const buildDailyReport = (records = [], directory = {}) =>
    attachEmployeeDetails(records, directory).sort((a, b) =>
        String(a.employeeName).localeCompare(String(b.employeeName))
    );

/*
|--------------------------------------------------------------------------
| Monthly Report
|--------------------------------------------------------------------------
| One row per employee with their totals for the month.
| `monthRecords` is the raw `{ [date]: { [employeeId]: record } }` tree.
*/

/*
| `holidayDates` are the days the office was closed. They are left out of the
| totals entirely: a holiday is not a working day, so counting it would drag
| every attendance rate down by a day the employee was never expected in.
|
| Omitting the argument keeps the original record based counting, so a caller
| that has not loaded the holiday calendar behaves exactly as it did before.
*/

export const buildMonthlyReport = (
    directory = {},
    monthRecords = {},
    holidayDates = []
) => {

    const holidays = new Set(holidayDates);

    /*
    | Only the holidays that fall inside the month being reported, so the
    | count on each row describes this month and not the whole year.
    |
    | The month is read off the records tree, whose keys are all days of the
    | one month that was fetched. A month with no records at all reports no
    | holidays, which is the honest answer: there is nothing to report on.
    */
    const monthPrefix =
        Object.keys(monthRecords)[0]?.slice(0, 7) || "";

    const monthHolidays = monthPrefix
        ? holidayDates.filter((date) =>
            String(date).startsWith(monthPrefix)
        ).length
        : 0;

    const report = Object.values(directory).map((employee) => {

        const summary = {
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            halfDay: 0,
            pending: 0,
            workingDays: 0,
            totalMinutes: 0,
        };

        Object.entries(monthRecords).forEach(([date, dayRecords]) => {

            if (holidays.has(date)) return;

            const record = dayRecords?.[employee.employeeId];

            if (!record) return;

            summary.workingDays++;

            /*
            | Counted exactly as the daily summary counts it: a day still
            | waiting on approval is Pending and nothing else, and a day that
            | was turned down is an absence. The hours below are still added
            | either way - they are what was worked, and the month has to show
            | them for the day to be reviewable at all.
            */

            if (isPendingApproval(record)) {

                summary.pending++;

                summary.totalMinutes += parseWorkingMinutes(record.workingHours);

                return;

            }

            if (isRejected(record)) {

                summary.absent++;

                summary.totalMinutes += parseWorkingMinutes(record.workingHours);

                return;

            }

            switch (record.status) {

                case ATTENDANCE_STATUS.PRESENT:
                    summary.present++;
                    break;

                case ATTENDANCE_STATUS.LATE:
                    summary.late++;
                    break;

                case ATTENDANCE_STATUS.ABSENT:
                    summary.absent++;
                    break;

                case ATTENDANCE_STATUS.LEAVE:
                    summary.leave++;
                    break;

                case ATTENDANCE_STATUS.HALF_DAY:
                    summary.halfDay++;
                    break;

                default:
                    break;

            }

            summary.totalMinutes += parseWorkingMinutes(record.workingHours);

        });

        const attended =
            summary.present + summary.late + summary.halfDay;

        return {

            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            designation: employee.designation,

            present: summary.present,
            late: summary.late,
            absent: summary.absent,
            leave: summary.leave,
            halfDay: summary.halfDay,
            pending: summary.pending,
            workingDays: summary.workingDays,

            holidays: monthHolidays,

            attendanceRate:
                summary.workingDays === 0
                    ? 0
                    : Math.round((attended / summary.workingDays) * 100),

            totalMinutes: summary.totalMinutes,

            workingHours: formatWorkingMinutes(summary.totalMinutes),

        };

    });

    return report.sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
    );

};

/*
|--------------------------------------------------------------------------
| Employee Report
|--------------------------------------------------------------------------
| A day by day row for a single employee. Days without a record are reported
| as Absent so gaps in the month are visible instead of missing.
|
| `holidayMap` is a `{ "YYYY-MM-DD": holiday }` lookup. A day with no record
| that falls on a declared holiday is reported as a Holiday instead, named by
| its remark, because the office was closed and nobody was expected in.
|
| A holiday the employee actually worked keeps its record: the punch happened
| and the hours are real, whatever the calendar says about the day.
*/

export const buildEmployeeReport = (
    employeeId,
    monthRecords = {},
    dateKeys = [],
    holidayMap = {}
) => {

    const today = getDateKey();

    return dateKeys
        .filter((date) => date <= today)
        .map((date) => {

            const record = monthRecords?.[date]?.[employeeId];

            if (!record) {

                const holiday = holidayMap?.[date];

                /*
                | A day nobody was expected in is not an absence. A holiday
                | that lands on a weekly off is reported once, as the holiday,
                | so the day carries the reason it was declared rather than
                | the weekday it happened to fall on.
                */

                const weeklyOff = !holiday && isWeeklyOff(date);

                let status = ATTENDANCE_STATUS.ABSENT;

                if (holiday) {
                    status = ATTENDANCE_STATUS.HOLIDAY;
                } else if (weeklyOff) {
                    status = ATTENDANCE_STATUS.WEEKLY_OFF;
                }

                /*
                | Nothing was ever recorded for this day, so there is nothing
                | to approve: the empty approval keeps it out of the pending
                | queue and out of the approval column.
                */

                return {
                    date,
                    employeeId,
                    punchIn: null,
                    punchOut: null,
                    workingHours: "",
                    status,
                    approvalStatus: "",
                    remarks:
                        holiday?.name ||
                        (weeklyOff ? getDayName(date) : ""),
                };

            }

            return { ...record, date };

        });

};

/*
|--------------------------------------------------------------------------
| Department Report
|--------------------------------------------------------------------------
| Rolls the monthly rows up per department.
*/

export const buildDepartmentReport = (monthlyRows = []) => {

    const departments = {};

    monthlyRows.forEach((row) => {

        const name = row.department || "Unassigned";

        if (!departments[name]) {

            departments[name] = {
                department: name,
                employees: 0,
                present: 0,
                late: 0,
                absent: 0,
                leave: 0,
                halfDay: 0,
                pending: 0,
                workingDays: 0,
                totalMinutes: 0,
            };

        }

        const department = departments[name];

        department.employees++;
        department.present += row.present;
        department.late += row.late;
        department.absent += row.absent;
        department.leave += row.leave;
        department.halfDay += row.halfDay;
        department.pending += row.pending;
        department.workingDays += row.workingDays;
        department.totalMinutes += row.totalMinutes;

    });

    return Object.values(departments)
        .map((department) => ({

            ...department,

            attendanceRate:
                department.workingDays === 0
                    ? 0
                    : Math.round(
                        ((department.present +
                            department.late +
                            department.halfDay) /
                            department.workingDays) * 100
                    ),

            workingHours: formatWorkingMinutes(department.totalMinutes),

        }))
        .sort((a, b) =>
            String(a.department).localeCompare(String(b.department))
        );

};

/*
|--------------------------------------------------------------------------
| Month Summary
|--------------------------------------------------------------------------
| The summary cards expect the same shape `getAttendanceSummary` returns, so
| monthly totals are converted into it here instead of inside the page.
*/

export const getMonthlySummary = (monthlyRows = []) => {

    const summary = monthlyRows.reduce(
        (totals, row) => ({
            present: totals.present + row.present,
            late: totals.late + row.late,
            absent: totals.absent + row.absent,
            leave: totals.leave + row.leave,
            halfDay: totals.halfDay + row.halfDay,
            pending: totals.pending + (row.pending || 0),
            total: totals.total + row.workingDays,
        }),
        {
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            halfDay: 0,
            pending: 0,
            total: 0,
        }
    );

    const percentage = (value) =>
        summary.total === 0
            ? 0
            : Math.round((value / summary.total) * 100);

    return {

        ...summary,

        presentPercentage: percentage(summary.present),

        absentPercentage: percentage(summary.absent),

        latePercentage: percentage(summary.late),

        leavePercentage: percentage(summary.leave),

        pendingPercentage: percentage(summary.pending),

        presentRate: percentage(
            summary.present + summary.late + summary.halfDay
        ),

    };

};
