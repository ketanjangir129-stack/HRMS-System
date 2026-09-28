import { FiClock, FiInbox } from "react-icons/fi";
import { assigneeName, formatDate } from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";
import TaskSectionCard from "./TaskSectionCard";

/*
|--------------------------------------------------------------------------
| Recent Tasks
|--------------------------------------------------------------------------
| Sabse haal mein bane ya badle 5 tasks. Order taskUtils.js ke recentTasks()
| se aata hai (updatedAt/createdAt jo bada ho).
|
| "View all" wahi kaam karta hai jo Urgent section mein — neeche wale
| TaskTable par scroll.
|--------------------------------------------------------------------------
*/

function RecentTasks({ tasks, employees, onViewAll }) {
  return (
    <TaskSectionCard
      title="Recent tasks"
      subtitle="Latest activity across the company"
      icon={<FiClock />}
      actionLabel="View all"
      onAction={onViewAll}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised">
            <FiInbox className="text-ink-faint" size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">No activity yet</p>
            <p className="mt-0.5 text-sm text-ink-subtle">
              Newly created tasks will show up here.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {tasks.map((task) => (
            <li key={task.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {task.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-subtle">
                    {assigneeName(task, employees)}
                    <span className="text-ink-faint">
                      {" · "}
                      {formatDate(task.dueDate)}
                    </span>
                  </p>
                </div>

                <div className="shrink-0">
                  <TaskBadge value={task.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TaskSectionCard>
  );
}

export default RecentTasks;
