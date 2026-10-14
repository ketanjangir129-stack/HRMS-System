import { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./LeaveCalendar.css";
import { getDateKey } from "../../../utils/attendance/attendanceDate";
import { LEAVE_CALENDAR_LEGEND } from "../../../utils/leave/leaveConstants";
import {
  formatLeaveDuration,
  formatLeaveType,
  getLeaveCalendarMap,
} from "../../../utils/leave/leaveUtils";
import LeaveStatusBadge from "../common/LeaveStatusBadge";

/*
|--------------------------------------------------------------------------
| Leave Calendar
|--------------------------------------------------------------------------
| The employee's leave year at a glance. Every day a request covers is
| highlighted, not only the day it starts on, so a five day range is drawn as
| five days.
|
| Tiles are matched on a local `YYYY-MM-DD` key: `toISOString()` converts to
| UTC first and would shift every highlight by a day in offsets such as IST.
|
| Selecting a highlighted day shows the request behind it, which is how a
| pending range is checked without scrolling to the history table.
|--------------------------------------------------------------------------
*/

function LeaveCalendar({
  requests = [],
  loading = false,
  year,
}) {

  const [value, setValue] = useState(() => new Date());

  const leaveByDate = useMemo(
    () => getLeaveCalendarMap(requests),
    [requests]
  );

  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    requests.forEach((r) => {
      const days = Number(r.days) || 1;
      const st = String(r.status || "").toLowerCase();
      if (st === "approved") approved += days;
      else if (st === "pending") pending += days;
      else if (st === "rejected") rejected += days;
    });
    return { approved, pending, rejected };
  }, [requests]);

  const selected = leaveByDate[getDateKey(value)] || null;

  /*
  | The selected year is browsed from its first day, so switching the year in
  | the header does not leave the calendar on a month of the previous one.
  */
  const activeStartDate = useMemo(() => {

    const today = new Date();

    return year === today.getFullYear()
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(year, 0, 1);

  }, [year]);

  return (

    <div className="ui-card ui-card-body flex flex-col">

      {/* Header */}

      <div className="mb-5">

        <h2 className="ui-card-title">
          Leave Calendar
        </h2>

        <p className="ui-card-subtitle">
          Your leave days across {year}
        </p>

      </div>

      {loading ? (

        <div className="space-y-3">

          <div className="h-8 w-full animate-pulse rounded-lg bg-surface-muted" />

          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                <div
                  key={cell}
                  className="h-8 animate-pulse rounded-md bg-surface-muted"
                />
              ))}
            </div>
          ))}

        </div>

      ) : (

        <Calendar
          /*
          | Remounted per year so the calendar jumps to the selected year
          | instead of staying on the month it was last browsed to.
          */
          key={year}
          onChange={setValue}
          value={value}
          className="leave-calendar"
          defaultActiveStartDate={activeStartDate}
          tileClassName={({ date, view }) =>
            view === "month"
              ? leaveByDate[getDateKey(date)]?.className || ""
              : ""
          }
        />

      )}

      {/* Details / Helper Section */}

      {!loading && selected && (
        <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-3.5 shadow-xs transition-all duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                {value.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {formatLeaveType(selected.request)}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                {formatLeaveDuration(selected.request.days)} ·{" "}
                {selected.request.reason || "No reason recorded"}
              </p>
            </div>
            <span className="shrink-0">
              <LeaveStatusBadge status={selected.status} size="sm" />
            </span>
          </div>
        </div>
      )}

      {!loading && !selected && (
        <div className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-line/80 bg-surface-muted/20 px-4 py-2.5 text-center transition-all">
          <p className="text-xs text-ink-subtle">
            Select any marked date on the calendar to view request details
          </p>
        </div>
      )}

      {/* Legend with Year Counts */}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3.5 sm:pt-4">
        {LEAVE_CALENDAR_LEGEND.map((item) => {
          const count = counts[item.label.toLowerCase()] || 0;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-1.5 rounded-lg border border-line-subtle bg-surface-muted/60 px-2.5 py-2 text-[11px] font-medium text-ink-muted transition-colors sm:text-xs"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-subtle shadow-xs">
                {count}d
              </span>
            </div>
          );
        })}
      </div>
    </div>

  );

}

export default LeaveCalendar;
