import {
  FiClock,
  FiTrendingUp,
  FiUserCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { formatTimeValue } from "../../utils/attendance/attendanceSettings";

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

/*
| `workRules` is the company's configured working day. The card only reads the
| start time off it, to say what the average punch in is being compared with;
| the hours progress bar it draws was already measured against the same
| schedule by `getAttendanceAnalytics`, so the two cannot disagree.
*/

function AttendanceAnalytics({ analytics = {}, workRules }) {

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
      subtitle: `Expected by ${formatTimeValue(workRules?.startTime)}`,
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
    <div className="ui-card ui-card-body flex h-full flex-col">

      {/* Header */}

      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">

        <div className="min-w-0">

          <h2 className="ui-card-title">
            Attendance Analytics
          </h2>

          <p className="ui-card-subtitle">
            Today's attendance insights
          </p>

        </div>

        <span className="ui-badge shrink-0 bg-blue-50 text-blue-700">

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

                <p className="truncate text-sm font-semibold text-ink-muted">
                  {row.title}
                </p>

                <p className="truncate text-xs text-ink-faint">
                  {row.subtitle}
                </p>

              </div>

              <span className="shrink-0 whitespace-nowrap text-base font-bold text-ink">
                {row.value}
              </span>

            </div>

            {row.progress !== null && (

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">

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
