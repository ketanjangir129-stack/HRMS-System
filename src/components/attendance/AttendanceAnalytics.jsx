import {
  FiClock,
  FiTrendingUp,
  FiUserCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { WORK_RULES } from "../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Analytics
|--------------------------------------------------------------------------
| Today's headline numbers, one row each.
|
| A row only carries a bar when its number is a share of something. The
| average punch in is a time of day and cannot be one, so it states the
| expected start time instead of drawing a bar that would always be full.
|
| Rows are spaced normally rather than spread down the card. The card sits in
| a row with the calendar, which is much taller, and stretching four rows to
| match it left the panel looking half empty.
|--------------------------------------------------------------------------
*/

/*
| Widths go straight into a style attribute, so anything that is not a usable
| number is pinned to zero rather than reaching the DOM as `NaN%`.
*/

const toPercent = (value) => {

  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.round(Math.min(Math.max(number, 0), 100));

};

function AttendanceAnalytics({ analytics = {} }) {

  const rows = [
    {
      title: "Present Rate",
      value: `${toPercent(analytics.presentRate)}%`,
      progress: analytics.presentRate,
      icon: <FiUserCheck />,
      iconColor: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
      subtitle: `${analytics.presentEmployees ?? 0} present today`,
    },
    {
      title: "Avg. Punch-In",
      value: analytics.averagePunchIn || "--",
      progress: null,
      icon: <FiClock />,
      iconColor: "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      subtitle: `Expected by ${WORK_RULES.startTime}`,
    },
    {
      title: "Working Hours",
      value: analytics.averageWorkingHours || "--",
      progress: analytics.workingHoursProgress,
      icon: <FiTrendingUp />,
      iconColor: "bg-purple-50 text-purple-600",
      bar: "bg-purple-500",
      subtitle: "Average across the day",
    },
    {
      title: "Late Arrivals",
      value: analytics.lateEmployees ?? 0,
      progress: analytics.lateRate,
      icon: <FiAlertCircle />,
      iconColor: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      subtitle: "Marked late today",
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

      {/* Header */}

      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">

        <div className="min-w-0">

          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Attendance Analytics
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Today's attendance insights
          </p>

        </div>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">

          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />

          Live

        </span>

      </div>

      {/* Rows */}

      <div className="space-y-5">

        {rows.map((row) => (

          <div key={row.title}>

            <div className="flex items-center gap-3">

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base sm:h-10 sm:w-10 sm:text-lg ${row.iconColor}`}
              >
                {row.icon}
              </div>

              {/*
              | The label block is the only part allowed to shrink, so a long
              | value such as "08:45 am" is never squeezed into two lines in
              | the narrow column the dashboard gives this card.
              */}
              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-semibold text-slate-800">
                  {row.title}
                </p>

                <p className="truncate text-xs text-slate-400">
                  {row.subtitle}
                </p>

              </div>

              <span className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900">
                {row.value}
              </span>

            </div>

            {row.progress !== null && (

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">

                <div
                  className={`h-full rounded-full transition-all duration-700 ${row.bar}`}
                  style={{ width: `${toPercent(row.progress)}%` }}
                />

              </div>

            )}

          </div>

        ))}

      </div>

    </div>
  );
}

export default AttendanceAnalytics;
