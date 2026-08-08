import { FiArrowRight } from "react-icons/fi";
import { SECTION_CARD_CLASS } from "../../utils/tasks/taskConstants";

/*
|--------------------------------------------------------------------------
| Task Section Card
|--------------------------------------------------------------------------
| Dashboard ke chaaron section (Progress, Workload, Urgent, Recent) ka
| common shell — white card, header patti, aur daayein "View all".
|
| Khud kuch nahi jaanta: na tasks, na Firebase. Bas children dikhata hai,
| aur "View all" par onAction bula deta hai. Yahi TaskTable ka pattern hai.
|--------------------------------------------------------------------------
*/

function TaskSectionCard({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  className = "",
  children,
}) {
  return (
    // h-full — grid mein saath wala card lamba ho to dono barabar dikhein
    <section className={`${SECTION_CARD_CLASS} flex h-full flex-col ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
              {icon}
            </span>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action optional hai — Progress aur Workload mein "View all" nahi hota */}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            {actionLabel}
            <FiArrowRight size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 px-6 py-5">{children}</div>
    </section>
  );
}

export default TaskSectionCard;
