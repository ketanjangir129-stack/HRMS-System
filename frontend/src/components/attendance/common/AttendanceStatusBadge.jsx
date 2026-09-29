import {
  FALLBACK_BADGE,
  FALLBACK_DOT,
  REQUEST_STATUS_BADGES,
  REQUEST_STATUS_DOTS,
  STATUS_BADGES,
  STATUS_DOTS,
} from "../../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
| One pill for attendance statuses (Present / Late / ...), request statuses
| and daily approval states (both Pending / Approved / Rejected), so the
| colours stay identical everywhere they appear.
|
| Only `attendance` picks the attendance palette. A decision is a decision
| whether it was made about a correction request or about a day of
| attendance, and both read better sharing one set of colours than they would
| with a second identical map to keep in step.
|--------------------------------------------------------------------------
*/

function AttendanceStatusBadge({
  status,
  variant = "attendance",
  size = "md",
}) {

  if (!status) {
    return <span className="text-sm text-ink-faint">--</span>;
  }

  const isAttendance = variant === "attendance";

  const badges = isAttendance ? STATUS_BADGES : REQUEST_STATUS_BADGES;

  const dots = isAttendance ? STATUS_DOTS : REQUEST_STATUS_DOTS;

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold ring-1 ${sizeClass} ${badges[status] || FALLBACK_BADGE}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[status] || FALLBACK_DOT}`}
      />
      {status}
    </span>
  );

}

export default AttendanceStatusBadge;
