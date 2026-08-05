import {
    ATTENDANCE_STATUS,
    WORK_RULES,
} from "./attendanceConstants";
import { getDateKey } from "./attendanceDate";

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
    totalEmployees = null
) => {

    const summary = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfDay: 0,
        total: attendance.length,
    };

    attendance.forEach((employee) => {

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
    */
    if (
        typeof totalEmployees === "number" &&
        totalEmployees > 0
    ) {

        summary.total = totalEmployees;

        summary.absent = Math.max(
            totalEmployees -
            summary.present -
            summary.late -
            summary.leave -
            summary.halfDay,
            0
        );

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
    totalEmployees = null
) => {

    const summary = getAttendanceSummary(
        attendance,
        totalEmployees
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

    const lateEmployees = attendance.filter(
        (employee) => employee.status === ATTENDANCE_STATUS.LATE
    ).length;

    return {

        presentRate: summary.presentRate,

        presentEmployees: summary.present,

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

export const getAttendanceCalendar = (history = []) => {

    const calendar = {};

    history.forEach((record) => {

        if (!record?.date || !record?.status) return;

        calendar[record.date] = String(record.status).toLowerCase();

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

export const buildMonthlyReport = (directory = {}, monthRecords = {}) => {

    const report = Object.values(directory).map((employee) => {

        const summary = {
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            halfDay: 0,
            workingDays: 0,
            totalMinutes: 0,
        };

        Object.values(monthRecords).forEach((dayRecords) => {

            const record = dayRecords?.[employee.employeeId];

            if (!record) return;

            summary.workingDays++;

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
            workingDays: summary.workingDays,

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
*/

export const buildEmployeeReport = (
    employeeId,
    monthRecords = {},
    dateKeys = []
) => {

    const today = getDateKey();

    return dateKeys
        .filter((date) => date <= today)
        .map((date) => {

            const record = monthRecords?.[date]?.[employeeId];

            if (!record) {

                return {
                    date,
                    employeeId,
                    punchIn: null,
                    punchOut: null,
                    workingHours: "",
                    status: ATTENDANCE_STATUS.ABSENT,
                    remarks: "",
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
            total: totals.total + row.workingDays,
        }),
        {
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            halfDay: 0,
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

        presentRate: percentage(
            summary.present + summary.late + summary.halfDay
        ),

    };

};
