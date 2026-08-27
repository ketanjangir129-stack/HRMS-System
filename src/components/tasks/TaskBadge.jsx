import { FiChevronDown } from "react-icons/fi";
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
|
| withCaret sirf table ke status pill par lagta hai, jahan badge ke peeche
| ek paardarshi <select> hota hai. Caret pill ke ANDAR aata hai taaki wo
| alag latka hua na lage. Baaki jagah (Urgent, Recent, Details) badge sirf
| padhne ke liye hai, isliye default false.
|--------------------------------------------------------------------------
*/

function TaskBadge({ value, variant = "status", withCaret = false }) {
  if (!value) {
    return <span className="text-sm text-ink-faint">--</span>;
  }

  const styles = variant === "priority" ? PRIORITY_STYLES : STATUS_STYLES;
  const dots = variant === "priority" ? PRIORITY_DOTS : STATUS_DOTS;

  return (
    <span
      // whitespace-nowrap — "In Progress" pill ke andar do line mein tootta tha
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-3 text-xs font-semibold ${
        withCaret ? "pr-2" : "pr-3"
      } ${
        styles[value] ||
        "bg-surface-muted text-ink-muted ring-1 ring-inset ring-line"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[value] || "bg-slate-400"}`}
      />
      {value}
      {withCaret && (
        // Rang pill ka hi (currentColor), bas halka — apna slate rang dete
        // to teen alag pill par teen jagah odd lagta
        <FiChevronDown size={13} className="shrink-0 opacity-60" />
      )}
    </span>
  );
}

export default TaskBadge;
