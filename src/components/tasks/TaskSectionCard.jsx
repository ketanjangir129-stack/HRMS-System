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
      {/*
        Header ki patti Dashboard ke card jaisi: title `ui-card-title` mein,
        caption `ui-card-subtitle` mein, aur daayein ek text link — bhara hua
        button nahi, kyunki wo panel par kaam nahi karta, sirf list badalta hai.
      */}
      <div className="flex flex-col gap-3 border-b border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="ui-tile ui-tile-sm bg-brand-ring text-lg text-brand">
              {icon}
            </span>
          )}

          <div className="min-w-0">
            <h2 className="ui-card-title">{title}</h2>
            {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
          </div>
        </div>

        {/* Action optional hai — Progress aur Workload mein "View all" nahi hota */}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            {actionLabel}
            <FiArrowRight
              className="transition-transform group-hover:translate-x-0.5"
              size={14}
            />
          </button>
        )}
      </div>

      <div className="flex-1 px-6 py-4">{children}</div>
    </section>
  );
}

export default TaskSectionCard;
