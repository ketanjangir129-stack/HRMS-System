/*
|--------------------------------------------------------------------------
| Attendance Summary
|--------------------------------------------------------------------------
*/

export const getAttendanceSummary = (attendance = []) => {

    const summary = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: attendance.length,
    };

    attendance.forEach((employee) => {

        switch (employee.status) {

            case "Present":
                summary.present++;
                break;

            case "Late":
                summary.late++;
                break;

            case "Absent":
                summary.absent++;
                break;

            case "Leave":
                summary.leave++;
                break;

            default:
                break;

        }

    });

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
            summary.present + summary.late
        ),

    };

};

/*
|--------------------------------------------------------------------------
| Average Check In
|--------------------------------------------------------------------------
*/

const averageTime = (times = []) => {

    if (!times.length) return "--";

    const avg =
        times.reduce((a, b) => a + b, 0) /
        times.length;

    return new Date(avg).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

};

/*
|--------------------------------------------------------------------------
| Working Hours
|--------------------------------------------------------------------------
*/

const parseHours = (value = "") => {

    const match = value.match(/(\d+)h\s*(\d+)m/);

    if (!match) return 0;

    return (
        Number(match[1]) * 60 +
        Number(match[2])
    );

};

/*
|--------------------------------------------------------------------------
| Attendance Analytics
|--------------------------------------------------------------------------
*/

export const getAttendanceAnalytics = (
    attendance = []
) => {

    const summary =
        getAttendanceSummary(attendance);

    const checkIns = attendance
        .filter((emp) => emp.checkIn)
        .map((emp) => emp.checkIn);

    const workingMinutes = attendance
        .filter((emp) => emp.workingHours)
        .map((emp) =>
            parseHours(emp.workingHours)
        );

    const averageMinutes =
        workingMinutes.length === 0
            ? 0
            : Math.round(
                workingMinutes.reduce(
                    (a, b) => a + b,
                    0
                ) / workingMinutes.length
            );

    const averageCheckIn =
        averageTime(checkIns);

    const averageWorkingHours =
        `${Math.floor(
            averageMinutes / 60
        )}h ${averageMinutes % 60}m`;

    const lateEmployees =
        attendance.filter(
            (emp) => emp.status === "Late"
        ).length;

    return {

        presentRate:
            summary.presentRate,

        presentEmployees:
            summary.present,

        averageCheckIn,

        averageWorkingHours,

        lateEmployees,

        workingHoursProgress:
            Math.min(
                (averageMinutes / 540) * 100,
                100
            ),

        lateRate:
            summary.total === 0
                ? 0
                : Math.round(
                    (lateEmployees /
                        summary.total) *
                    100
                ),

    };

};

/*
|--------------------------------------------------------------------------
| Attendance Activities
|--------------------------------------------------------------------------
*/

export const getAttendanceActivities = (
    attendance = []
) => {

    const activities = [];

    attendance.forEach((employee) => {

        if (employee.checkIn) {

            activities.push({

                id:
                    employee.employeeId +
                    "-in",

                employee:
                    employee.employeeName,

                title:
                    employee.status === "Late"
                        ? "Checked In Late"
                        : "Checked In",

                description:
                    employee.status === "Late"
                        ? "Late attendance recorded."
                        : "Attendance marked successfully.",

                type:
                    employee.status === "Late"
                        ? "late"
                        : "checkin",

                time:
                    employee.checkIn,

            });

        }

        if (employee.checkOut) {

            activities.push({

                id:
                    employee.employeeId +
                    "-out",

                employee:
                    employee.employeeName,

                title:
                    "Checked Out",

                description:
                    "Working hours calculated.",

                type:
                    "checkout",

                time:
                    employee.checkOut,

            });

        }

    });

    return activities.sort(
        (a, b) => b.time - a.time
    );

};
/*
|--------------------------------------------------------------------------
| Calendar Data
|--------------------------------------------------------------------------
*/

export const getAttendanceCalendar = (history = []) => {

    const calendar = {};

    history.forEach((record) => {

        calendar[record.date] = record.status.toLowerCase();

    });

    return calendar;

};