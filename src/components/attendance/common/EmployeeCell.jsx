import { getInitials } from "../../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Employee Cell
|--------------------------------------------------------------------------
| Avatar with the employee name and a supporting line. Records only store the
| employee id, so the name is resolved before it reaches this component and
| the id is used as the fallback.
|--------------------------------------------------------------------------
*/

function EmployeeCell({
  name,
  employeeId,
  subtitle,
  size = "md",
}) {

  const displayName = name || employeeId || "--";

  const avatarClass =
    size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  return (
    <div className="flex min-w-0 items-center gap-3">

      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700 ${avatarClass}`}
      >
        {getInitials(displayName)}
      </div>

      <div className="min-w-0">

        <p className="truncate font-semibold text-slate-800">
          {displayName}
        </p>

        <p className="truncate text-xs text-slate-500">
          {subtitle || employeeId}
        </p>

      </div>

    </div>
  );

}

export default EmployeeCell;
