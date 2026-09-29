import {
  EQUIPMENT_STATUS_BADGES,
  FALLBACK_RESIGNATION_BADGE,
  FALLBACK_RESIGNATION_DOT,
  RESIGNATION_STATUS_BADGES,
  RESIGNATION_STATUS_DOTS,
} from "../../../utils/resignation/resignationConstants";

/*
|--------------------------------------------------------------------------
| Resignation Status Badge
|--------------------------------------------------------------------------
| The pill an exit's state is written in.
|
| It does not reuse `AttendanceStatusBadge` the way the leave badge does,
| because the two are not the same vocabulary. That badge knows three states
| - pending, approved, rejected - and an exit has nine, six of which are
| varieties of "still moving" that would all collapse into one amber pill.
|
| The colours it uses are the same ones, though, taken from the same palette
| in `resignationConstants`: amber is waiting on a person, blue is waiting on
| a step, emerald is done, red is refused. So the two badges look like they
| belong to one app without one of them having to lie about its states.
|--------------------------------------------------------------------------
*/

function ResignationStatusBadge({ status, size = "md" }) {

  if (!status) {
    return <span className="text-sm text-ink-faint">—</span>;
  }

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold ${sizeClass} ${
        RESIGNATION_STATUS_BADGES[status] || FALLBACK_RESIGNATION_BADGE
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          RESIGNATION_STATUS_DOTS[status] || FALLBACK_RESIGNATION_DOT
        }`}
      />
      {status}
    </span>
  );

}

/*
| The smaller pill one piece of equipment is marked with. It lives here
| rather than in its own file because it is the same shape as the badge above
| and is only ever shown beside it.
*/

export function EquipmentStatusBadge({ status }) {

  if (!status) {
    return <span className="text-xs text-ink-faint">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        EQUIPMENT_STATUS_BADGES[status] || FALLBACK_RESIGNATION_BADGE
      }`}
    >
      {status}
    </span>
  );

}

export default ResignationStatusBadge;
