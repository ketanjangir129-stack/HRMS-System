import {
  FALLBACK_BADGE,
  FALLBACK_DOT,
} from "../../../utils/attendance/attendanceConstants";
import {
  HOLIDAY_TYPE_BADGES,
  HOLIDAY_TYPE_DOTS,
  OPTIONAL_BADGE,
} from "../../../utils/holiday/holidayConstants";

/*
|--------------------------------------------------------------------------
| Holiday Type Badge
|--------------------------------------------------------------------------
| The same pill the attendance and leave modules use, keyed on the holiday
| type instead of a status. The fallback colours are shared with them, so a
| type saved before it was renamed still renders as a badge rather than as
| unstyled text.
|
| An optional holiday carries a second pill: the difference between a day the
| office is closed and a day an employee may choose to take off matters more
| than the type does.
|--------------------------------------------------------------------------
*/

function HolidayTypeBadge({
  type,
  isOptional = false,
  size = "md",
}) {

  if (!type) {
    return <span className="text-sm text-slate-400">--</span>;
  }

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1 text-xs";

  return (

    <span className="inline-flex flex-wrap items-center gap-1.5">

      <span
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold ring-1 ${sizeClass} ${HOLIDAY_TYPE_BADGES[type] || FALLBACK_BADGE}`}
      >

        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${HOLIDAY_TYPE_DOTS[type] || FALLBACK_DOT}`}
        />

        {type}

      </span>

      {isOptional && (

        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ${sizeClass} ${OPTIONAL_BADGE}`}
        >
          Optional
        </span>

      )}

    </span>

  );

}

export default HolidayTypeBadge;
