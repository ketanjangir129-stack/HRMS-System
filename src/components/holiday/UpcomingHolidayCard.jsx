import { FiCalendar, FiSun } from "react-icons/fi";
import { AttendancePanel } from "../attendance/common/AttendancePanel";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../attendance/common/AttendanceState";
import {
  formatDaysUntil,
  formatHolidayDate,
  getDayName,
} from "../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "./common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays
|--------------------------------------------------------------------------
| The next holidays from today onwards, nearest first, so the day everyone is
| planning around is visible without reading the table below.
|
| The list crosses the year boundary: in December the next holiday is usually
| in January, and a panel that stopped at the 31st would be empty exactly
| when it is most useful.
|
| The first row is drawn larger than the rest, because "the next holiday" is
| the one question this panel is opened to answer.
|--------------------------------------------------------------------------
*/

function UpcomingHolidayCard({
  holidays = [],
  loading = false,
  error = "",
  onRetry,
}) {

  const [next, ...rest] = holidays;

  return (

    <AttendancePanel
      title="Upcoming Holidays"
      subtitle={
        next
          ? `${next.name} is ${formatDaysUntil(next.daysUntil).toLowerCase()}`
          : "The next days the office is closed"
      }
      action={
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {holidays.length} Upcoming
        </span>
      }
      className="h-full"
    >

      {loading && <TableSkeleton rows={3} />}

      {!loading && error && (
        <ErrorState message={error} onRetry={onRetry} />
      )}

      {!loading && !error && holidays.length === 0 && (

        <EmptyState
          icon={<FiSun size={28} />}
          title="No Upcoming Holidays"
          message="Holidays declared for the coming days will appear here."
        />

      )}

      {!loading && !error && holidays.length > 0 && (

        <div className="divide-y divide-slate-100">

          {/* Next holiday */}

          <div className="flex flex-col gap-3 bg-blue-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">

            <div className="flex min-w-0 items-center gap-3 sm:gap-4">

              {/*
              | A date block rather than an icon: the date is the thing being
              | looked up, so it is what the eye should land on first.
              */}
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 sm:h-14 sm:w-14">

                <span className="text-base font-bold leading-none sm:text-lg">
                  {String(next.date).slice(8, 10)}
                </span>

                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {formatHolidayDate(next.date).slice(3, 6)}
                </span>

              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  {next.name}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {getDayName(next.date)} · {formatHolidayDate(next.date)}
                </p>

              </div>

            </div>

            {/* Indented to clear the date block when the row stacks on mobile. */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 pl-15 sm:pl-0">

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                {formatDaysUntil(next.daysUntil)}
              </span>

              <HolidayTypeBadge
                type={next.type}
                isOptional={next.isOptional}
                size="sm"
              />

            </div>

          </div>

          {/* The rest */}

          {rest.map((holiday) => (

            <div
              key={holiday.holidayId}
              className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >

              <div className="flex min-w-0 items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiCalendar />
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold text-slate-800">
                    {holiday.name}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {getDayName(holiday.date, { short: true })} ·{" "}
                    {formatHolidayDate(holiday.date)} ·{" "}
                    {formatDaysUntil(holiday.daysUntil)}
                  </p>

                </div>

              </div>

              {/* Indented to clear the icon when the row stacks on mobile. */}
              <div className="flex shrink-0 items-center gap-2 pl-13 sm:pl-0">

                <HolidayTypeBadge
                  type={holiday.type}
                  isOptional={holiday.isOptional}
                  size="sm"
                />

              </div>

            </div>

          ))}

        </div>

      )}

    </AttendancePanel>

  );

}

export default UpcomingHolidayCard;
