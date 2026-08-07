import { FiEdit2, FiInbox, FiPlus, FiTrash2 } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { PRIMARY_BUTTON_CLASS } from "../../utils/tasks/taskConstants";
import {
  assigneeName,
  formatDate,
  initials,
  isOverdue,
  todayInputValue,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";

/*
|--------------------------------------------------------------------------
| Task Table
|--------------------------------------------------------------------------
| Sirf list dikhata hai. Firebase se baat nahi karta — status badalna ya
| delete karna page ka kaam hai, ye bas onStatusChange / onDelete bula deta hai.
|
| hasTasks: filter lagne se pehle koi task tha ya nahi. Isse tay hota hai ki
| khaali table par "No matching tasks" dikhe ya "No tasks yet".
|--------------------------------------------------------------------------
*/

function RowAction({ tone, title, onClick, icon }) {
  const styles = {
    edit: "hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600",
    delete: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all ${styles[tone]}`}
    >
      {icon}
    </button>
  );
}

function TaskTable({
  tasks,
  employees,
  onStatusChange,
  onEdit,
  onDelete,
  onCreate,
  hasTasks,
  // Owner/HR ke liye true. Employee ke liye false — tab Assignee column
  // aur Actions ke buttons dikhte hi nahi.
  canManage = true,
}) {
  const today = todayInputValue();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-16 px-6 py-4 text-center">#</th>
            <th className="px-6 py-4">Task</th>
            {canManage && <th className="px-6 py-4">Assignee</th>}
            <th className="px-6 py-4">Due date</th>
            <th className="px-6 py-4">Priority</th>
            <th className="px-6 py-4">Status</th>
            {canManage && <th className="w-28 px-6 py-4 text-center">Actions</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {tasks.map((task, index) => {
            const name = assigneeName(task, employees);
            const overdue = isOverdue(task, today);

            return (
              <tr
                key={task.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                {/* Row ka number — filter lagne par bhi 1, 2, 3 hi rahega */}
                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                  {index + 1}
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 max-w-sm text-xs text-slate-500">
                      {task.description}
                    </p>
                  )}
                </td>

                {canManage && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {initials(name)}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {name}
                      </span>
                    </div>
                  </td>
                )}

                <td className="px-6 py-4">
                  <span
                    className={`text-sm ${
                      overdue
                        ? "font-semibold text-red-600"
                        : "font-medium text-slate-700"
                    }`}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                  {overdue && (
                    <p className="mt-0.5 text-xs font-medium text-red-500">
                      Overdue
                    </p>
                  )}
                </td>

                <td className="px-6 py-4">
                  <TaskBadge value={task.priority || "Medium"} variant="priority" />
                </td>

                <td className="px-6 py-4">
                  <div className="relative inline-block">
                    <select
                      value={task.status || TASK_STATUSES[0]}
                      onChange={(event) =>
                        onStatusChange(task, event.target.value)
                      }
                      aria-label={`Change status of ${task.title}`}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <TaskBadge value={task.status || TASK_STATUSES[0]} />
                  </div>
                </td>

                {canManage && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <RowAction
                        tone="edit"
                        title={`Edit ${task.title}`}
                        onClick={() => onEdit(task)}
                        icon={<FiEdit2 size={16} />}
                      />
                      <RowAction
                        tone="delete"
                        title={`Delete ${task.title}`}
                        onClick={() => onDelete(task)}
                        icon={<FiTrash2 size={16} />}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}

          {tasks.length === 0 && (
            <tr>
              {/* canManage false ho to Assignee aur Actions column nahi hote */}
              <td colSpan={canManage ? 7 : 5} className="px-6 py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FiInbox size={26} />
                  </span>

                  {hasTasks ? (
                    // Tasks hain, bas filter se match nahi hue
                    <div>
                      <p className="font-semibold text-slate-800">
                        No matching tasks
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try a different search or status filter.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {canManage ? "No tasks yet" : "Nothing assigned yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {canManage
                            ? "Create your first task to start tracking work."
                            : "Tasks assigned to you will show up here."}
                        </p>
                      </div>

                      {onCreate && (
                        <button
                          type="button"
                          onClick={onCreate}
                          className={PRIMARY_BUTTON_CLASS}
                        >
                          <FiPlus />
                          Create task
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TaskTable;
