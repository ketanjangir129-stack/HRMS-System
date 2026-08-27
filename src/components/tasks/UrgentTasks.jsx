import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import {
  assigneeName,
  dueLabel,
  formatDate,
  isOverdue,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";
import TaskSectionCard from "./TaskSectionCard";

/*
|--------------------------------------------------------------------------
| Urgent & Overdue Tasks
|--------------------------------------------------------------------------
| Jo nikal chuke hain ya High priority hain — overdue pehle. List taskUtils.js
| ke urgentTasks() se aati hai, ye sirf dikhata hai.
|
| "View all" naya page nahi kholta — usi page ke neeche wale TaskTable par
| scroll karata hai (page onViewAll mein wahi karta hai).
|--------------------------------------------------------------------------
*/

function UrgentTasks({ tasks, employees, today, onViewAll }) {
  return (
    <TaskSectionCard
      title="Urgent & overdue"
      subtitle="Overdue first, then high priority"
      icon={<FiAlertCircle />}
      actionLabel="View all"
      onAction={onViewAll}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <FiCheckCircle className="text-emerald-500" size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Nothing urgent</p>
            <p className="mt-0.5 text-sm text-ink-subtle">
              No overdue or high priority tasks right now.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {tasks.map((task) => {
            const overdue = isOverdue(task, today);

            return (
              <li key={task.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {task.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-subtle">
                      {assigneeName(task, employees)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <TaskBadge
                      value={task.priority || "Medium"}
                      variant="priority"
                    />
                    <TaskBadge value={task.status} />
                  </div>
                </div>

                <p
                  className={`mt-1.5 text-xs font-medium ${
                    overdue ? "text-red-600" : "text-ink-subtle"
                  }`}
                >
                  {formatDate(task.dueDate)}
                  {task.dueDate && (
                    <span className="ml-1.5 text-ink-faint">
                      · {dueLabel(task.dueDate, today)}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </TaskSectionCard>
  );
}

export default UrgentTasks;
