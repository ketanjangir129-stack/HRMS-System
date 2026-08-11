import { FiClock, FiEdit2, FiInbox, FiPlus, FiTrash2 } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import {
  PRIMARY_BUTTON_CLASS,
  STATUS_DOTS,
} from "../../utils/tasks/taskConstants";
import {
  assigneeName,
  formatDate,
  isOverdue,
  todayInputValue,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";
import TaskSelect from "./TaskSelect";

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

// Status dropdown ki rows — dot ka rang wahi jo badge ka hai, isliye list
// aur pill dono ek hi bhasha bolte hain
const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: status,
  dot: STATUS_DOTS[status],
}));

function RowAction({ tone, title, onClick, icon }) {
  const styles = {
    // Activity kuch badalti nahi, sirf dikhati hai — isliye saada slate,
    // taaki edit ka blue aur delete ka red apna matlab na kho dein
    activity: "hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700",
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
  // Row click/Enter par details modal — page se aata hai. Na mile to row
  // saadi rehti hai.
  onRowClick,
  /*
  | Activity column dikhe ya nahi — page tasks.activity ke haq se tay karta
  | hai, bilkul waise jaise showActions apne permissions se tay hota hai.
  | Haq na ho to column hi nahi banta, khaali cells nahi bachte.
  */
  showActivity = false,
  // Activity icon ka click — page id yaad rakhkar modal khol deta hai
  onActivityClick,
  hasTasks,
  // showAssignee false ho to sirf apne hi tasks dikh rahe hain, to Assignee
  // column bekaar hai.
  showAssignee = true,
  /*
  | canUpdate ek FUNCTION hai, boolean nahi — edit ka haq har task par alag
  | ho sakta hai. Owner/HR ke liye hamesha true, par Employee sirf apna
  | banaya task edit kar sakta hai. Isliye per-row poochhna padta hai.
  */
  canUpdate = () => true,
  canDelete = true,
  /*
  | Actions column dikhe ya nahi. Page se aata hai, yahan tasks se nahi
  | nikalte — warna filter se editable rows hat jaate hi column gayab ho
  | jaata aur filter hatane par wapas aa jaata.
  */
  showActions = true,
}) {
  const today = todayInputValue();

  // Status/Edit/Delete row ke andar hain — unka event upar na jaye,
  // warna status badalte hi details modal bhi khul jaata
  const stopRowActivation = {
    onClick: (event) => event.stopPropagation(),
    onKeyDown: (event) => event.stopPropagation(),
  };

  // Mouse ke bina bhi details tak pahunch — Space page ko scroll karta hai,
  // isliye preventDefault
  const handleRowKeyDown = (event, task) => {
    if (!onRowClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onRowClick(task);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-left">
        {/* thead/tbody classes DataTable jaisi — poore project ka table pattern */}
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {/*
              Alignment HolidayTable/LeaveHistoryTable jaisa: text left,
              badges center, actions right. Koi fixed width nahi — column
              apne aap size lete hain, wahi in tables mein hota hai.
            */}
            <th className="px-6 py-3 font-semibold">Task</th>
            {showAssignee && (
              <th className="px-6 py-3 font-semibold">Assignee</th>
            )}
            <th className="whitespace-nowrap px-6 py-3 font-semibold">
              Due date
            </th>
            <th className="px-6 py-3 text-center font-semibold">Priority</th>
            <th className="px-6 py-3 text-center font-semibold">Status</th>
            {/*
              Activity ka apna column — Actions ke bahar, kyunki wo sirf
              padhne wala kaam hai aur uska haq (tasks.activity) edit/delete
              se bilkul alag chalta hai.
            */}
            {showActivity && (
              <th className="px-6 py-3 text-center font-semibold">Activity</th>
            )}
            {showActions && (
              <th className="whitespace-nowrap px-6 py-3 text-right font-semibold">
                Actions 
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const name = assigneeName(task, employees);
            const overdue = isOverdue(task, today);

            return (
              <tr
                key={task.id}
                onClick={() => onRowClick?.(task)}
                onKeyDown={(event) => handleRowKeyDown(event, task)}
                // Keyboard tabhi, jab row par kuch hota ho
                tabIndex={onRowClick ? 0 : undefined}
                title={onRowClick ? `View details of ${task.title}` : undefined}
                className={`transition-colors hover:bg-slate-50 ${
                  onRowClick
                    ? "cursor-pointer focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    : ""
                }`}
              >
                {/* min-w-0 wrapper + truncate — HolidayTable ke name column
                    jaisa. Column ki width nahi bandhi, bas lamba text kinare
                    par kat jaata hai. */}
                <td className="px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {task.title}
                    </p>
                    {/* {task.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {task.description}
                      </p>
                    )} */}
                  </div>
                </td>

                {showAssignee && (
                  <td className="px-6 py-4">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {name}
                    </span>
                  </td>
                )}

                {/* whitespace-nowrap — warna "Aug 15, 2026" do line mein tootti */}
                <td className="whitespace-nowrap px-6 py-4">
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

                <td className="px-6 py-4 text-center">
                  <TaskBadge value={task.priority || "Medium"} variant="priority" />
                </td>

                {/* Status badalne par details modal nahi khulna chahiye */}
                <td
                  className="px-6 py-4 text-center"
                  {...stopRowActivation}
                >
                  {/*
                    Badge hi dropdown ka trigger hai — pehle uske upar ek
                    paardarshi native <select> baithta tha, par uski khuli
                    hui list OS banata hai aur wo baaki UI se alag dikhti
                    thi. Ab list bhi apni hai (TaskSelect).

                    withCaret pill ke andar chevron laga deta hai — warna
                    badge bilkul static lagta hai.
                  */}
                  <TaskSelect
                    options={STATUS_OPTIONS}
                    value={task.status || TASK_STATUSES[0]}
                    onChange={(next) => onStatusChange(task, next)}
                    ariaLabel={`Change status of ${task.title}`}
                    className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    trigger={
                      <TaskBadge
                        value={task.status || TASK_STATUSES[0]}
                        withCaret
                      />
                    }
                  />
                </td>

                {/* Activity dekhna row kholne se alag hai — event yahin ruk
                    jaata hai, warna peeche details modal bhi khul jaata */}
                {showActivity && (
                  <td className="px-6 py-4 text-center" {...stopRowActivation}>
                    <RowAction
                      tone="activity"
                      title={`View activity of ${task.title}`}
                      // Cell par pehle se stopRowActivation hai, par yahan
                      // bhi rokte hain — kal button kahin aur jaye to bhi
                      // row activate na ho
                      onClick={(event) => {
                        event.stopPropagation();
                        onActivityClick(task);
                      }}
                      icon={<FiClock size={16} />}
                    />
                  </td>
                )}

                {showActions && (
                  // Edit/Delete dabane par bhi modal nahi khulna chahiye
                  <td
                    className="whitespace-nowrap px-6 py-4"
                    {...stopRowActivation}
                  >
                    {/*
                      h-9 — button ki hi height, taaki dash wali row aur
                      button wali row barabar rahein
                    */}
                    <div className="flex h-9 items-center justify-end gap-2">
                      {canUpdate(task) && (
                        <RowAction
                          tone="edit"
                          title={`Edit ${task.title}`}
                          onClick={() => onEdit(task)}
                          icon={<FiEdit2 size={16} />}
                        />
                      )}

                      {canDelete && (
                        <RowAction
                          tone="delete"
                          title={`Delete ${task.title}`}
                          onClick={() => onDelete(task)}
                          icon={<FiTrash2 size={16} />}
                        />
                      )}

                      {/*
                        Dono withheld — jaise Employee ka wo task jo HR ne
                        assign kiya. SalaryCRUD bhi aisi row par dash dikhata
                        hai, khaali cell ki jagah.
                      */}
                      {!canUpdate(task) && !canDelete && (
                        // h-9 w-9 — RowAction ka hi box, isliye dash theek
                        // wahin baithta hai jahan button baithta hai
                        <span
                          aria-label="No actions available"
                          className="inline-flex h-9 w-9 items-center justify-center text-slate-300"
                        >
                          —
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}

          {tasks.length === 0 && (
            <tr>
              {/*
                Task + Due date + Priority + Status = 4 pakke column,
                Assignee, Activity aur Actions chhip sakte hain
              */}
              <td
                colSpan={
                  4 +
                  (showAssignee ? 1 : 0) +
                  (showActivity ? 1 : 0) +
                  (showActions ? 1 : 0)
                }
                className="px-6 py-20"
              >
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
                          {showAssignee ? "No tasks yet" : "Nothing assigned yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {onCreate
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
