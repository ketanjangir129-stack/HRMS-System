import {
  PRIORITY_DOTS,
  PRIORITY_STYLES,
  STATUS_DOTS,
  STATUS_STYLES,
} from "../../utils/tasks/taskConstants";

/*
|--------------------------------------------------------------------------
| Task Badge
|--------------------------------------------------------------------------
| Ek hi pill status aur priority dono ke liye — jaise attendance module mein
| AttendanceStatusBadge dono kaam karta hai. Isse rang har jagah same rehte
| hain, chahe table ho ya dashboard card.
|--------------------------------------------------------------------------
*/

function TaskBadge({ value, variant = "status" }) {
  if (!value) {
    return <span className="text-sm text-slate-400">--</span>;
  }

  const styles = variant === "priority" ? PRIORITY_STYLES : STATUS_STYLES;
  const dots = variant === "priority" ? PRIORITY_DOTS : STATUS_DOTS;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[value] || "bg-slate-400"}`}
      />
      {value}
    </span>
  );
}

export default TaskBadge;
