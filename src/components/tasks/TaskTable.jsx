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

/*
| Button apna event khud rok leta hai — row par bhi click hai, aur bina iske
| Edit dabate hi peeche details modal bhi khul jaata.
|
| Ye rok button par hai, uske cell par nahi: cell mein px-4 py-4 lg:px-6 ki padding
| hai, aur wo padding pehle poori click kha jaati thi. Row bhar mein click
| chalti dikhti thi par teen column chup-chaap bekaar the.
|
| Keyboard bhi rokna padta hai: button par Enter dabao to click ke saath
| keydown bhi upar jaata hai, aur row usi Enter par khul jaati.
*/
function RowAction({ tone, title, onClick, icon }) {
  const styles = {
    // Activity kuch badalti nahi, sirf dikhati hai — isliye saada neutral,
    // taaki edit ka brand aur delete ka red apna matlab na kho dein
    activity: "hover:border-ink-faint hover:bg-surface-muted hover:text-ink",
    edit: "hover:border-brand hover:bg-blue-50 hover:text-brand",
    delete: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all ${styles[tone]}`}
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

  /*
  | Status dropdown row ke andar baithi hai — uska event upar na jaye, warna
  | status badalte hi details modal bhi khul jaata.
  |
  | Ye sirf dropdown ke apne dabbe par lagti hai, poore cell par nahi: cell
  | ki khaali jagah row ki hai, aur wahan click par details khulni chahiye.
  |
  | Dropdown ki khuli hui list portal se bahar render hoti hai, isliye uske
  | option par click yahan se guzarta hi nahi.
  */
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

  // Status dropdown — row mein bhi wahi, mobile card mein bhi. Ek jagah likha
  // hai taaki dono jagah ek hi cheez badle.
  const statusSelect = (task) => (
    <TaskSelect
      options={STATUS_OPTIONS}
      value={task.status || TASK_STATUSES[0]}
      onChange={(next) => onStatusChange(task, next)}
      ariaLabel={`Change status of ${task.title}`}
      className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      trigger={<TaskBadge value={task.status || TASK_STATUSES[0]} withCaret />}
    />
  );

  /*
  | Mobile card ke teen buttons ek hi kataar mein. Table mein ye alag-alag
  | baithte hain — Activity ka apna column hai — par card mein sab neeche ek
  | saath aate hain, wahi jo HolidayTable apne card ke footer mein karta hai.
  |
  | Har button apni wahi permission dekhta hai jo table mein dekhta hai,
  | isliye jo haq row par nahi hai wo card par bhi nahi milta.
  */
  const rowActions = (task) => (
    <>
      {showActivity && (
        <RowAction
          tone="activity"
          title={`View activity of ${task.title}`}
          onClick={() => onActivityClick(task)}
          icon={<FiClock size={16} />}
        />
      )}

      {showActions && canUpdate(task) && (
        <RowAction
          tone="edit"
          title={`Edit ${task.title}`}
          onClick={() => onEdit(task)}
          icon={<FiEdit2 size={16} />}
        />
      )}

      {showActions && canDelete && (
        <RowAction
          tone="delete"
          title={`Delete ${task.title}`}
          onClick={() => onDelete(task)}
          icon={<FiTrash2 size={16} />}
        />
      )}
    </>
  );

  const hasRowActions = (task) =>
    showActivity || (showActions && (canUpdate(task) || canDelete));

  /*
  |--------------------------------------------------------------------------
  | Mobile
  |--------------------------------------------------------------------------
  | md se neeche wahi task ek stacked card hai, row nahi — saat column 360px
  | mein har row par sideways scroll ban jaate the.
  |
  | Card wahi tarteeb rakhta hai jo scan karte waqt chahiye: title sabse upar
  | (list isi ke liye padhi jaati hai) aur status uske bilkul saamne, kyunki
  | wahi sabse zyada badla jaata hai. Due date aur priority neeche tinted
  | block mein — bilkul HolidayTable ke card jaisa.
  */
  const mobileCard = (task) => {
    const overdue = isOverdue(task, today);

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{task.title}</p>

            {showAssignee && (
              <p className="mt-0.5 truncate text-xs text-ink-subtle">
                {assigneeName(task, employees)}
              </p>
            )}
          </div>

          {/* shrink-0 — lamba title pill ko nichod na de */}
          <span className="shrink-0" {...stopRowActivation}>
            {statusSelect(task)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
          <span
            className={`inline-flex whitespace-nowrap rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold ring-1 ${
              overdue
                ? "text-red-600 ring-red-200"
                : "text-ink-muted ring-line"
            }`}
          >
            {formatDate(task.dueDate)}
          </span>

          {overdue && (
            <span className="text-xs font-semibold text-red-500">Overdue</span>
          )}

          {/* ml-auto — priority hamesha daayein kinare, chahe date kitni
              chhoti ho */}
          <span className="ml-auto">
            <TaskBadge value={task.priority || "Medium"} variant="priority" />
          </span>
        </div>

        {hasRowActions(task) && (
          <div className="flex items-center justify-end gap-2">
            {rowActions(task)}
          </div>
        )}
      </div>
    );
  };

  /*
  | Khaali list par table ka dhaancha hi nahi banta — na thead, na mobile
  | cards. DataTable bhi yahi karta hai: rows 0 hon to seedha EmptyState.
  | Pehle ye colSpan wali row thi, jo ab do layouts mein do baar dikhti.
  */
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-faint">
          <FiInbox size={26} />
        </span>

        {hasTasks ? (
          // Tasks hain, bas filter se match nahi hue
          <div>
            <p className="font-semibold text-ink">No matching tasks</p>
            <p className="mt-1 text-sm text-ink-subtle">
              Try a different search or status filter.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="font-semibold text-ink">
                {showAssignee ? "No tasks yet" : "Nothing assigned yet"}
              </p>
              <p className="mt-1 text-sm text-ink-subtle">
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
    );
  }

  return (
    <>
      {/* Mobile — card wrapper par wahi click/Enter jo row par hai */}
      <div className="divide-y divide-line-subtle md:hidden">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onRowClick?.(task)}
            onKeyDown={(event) => handleRowKeyDown(event, task)}
            tabIndex={onRowClick ? 0 : undefined}
            className={`px-4 py-4 transition-colors ${
              onRowClick
                ? "cursor-pointer active:bg-surface-muted focus:outline-none focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                : ""
            }`}
          >
            {mobileCard(task)}
          </div>
        ))}
      </div>

      {/*
        Table md se shuru hoti hai, isliye sabse tang chaudai ab phone ki
        nahi tablet ki hai. min-w un columns ke saath badhti hai jo har
        breakpoint par wapas aate hain.
      */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-left lg:min-w-[720px] xl:min-w-[860px]">
        {/* thead/tbody classes DataTable jaisi — poore project ka table pattern */}
        <thead className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
          <tr>
            {/*
              Alignment HolidayTable/LeaveHistoryTable jaisa: text left,
              badges center, actions right. Koi fixed width nahi — column
              apne aap size lete hain, wahi in tables mein hota hai.
            */}
            <th className="px-4 py-3 lg:px-6 font-semibold">Task</th>
            {showAssignee && (
              <th className="px-4 py-3 lg:px-6 font-semibold">Assignee</th>
            )}
            <th className="whitespace-nowrap px-4 py-3 lg:px-6 font-semibold">
              Due date
            </th>
            {/*
              Priority tablet par nikal jaati hai aur Task cell ke andar
              chali jaati hai — HolidayTable bhi apne type/description column
              ke saath yahi karta hai. Kuch chhupta nahi, bas jagah badal
              jaati hai.
            */}
            <th className="hidden px-4 py-3 lg:px-6 text-center font-semibold lg:table-cell">
              Priority
            </th>
            <th className="px-4 py-3 lg:px-6 text-center font-semibold">Status</th>
            {/*
              Activity ka apna column — Actions ke bahar, kyunki wo sirf
              padhne wala kaam hai aur uska haq (tasks.activity) edit/delete
              se bilkul alag chalta hai.
            */}
            {showActivity && (
              <th className="px-4 py-3 lg:px-6 text-center font-semibold">Activity</th>
            )}
            {showActions && (
              <th className="whitespace-nowrap px-4 py-3 lg:px-6 text-right font-semibold">
                Actions 
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-line-subtle">
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
                className={`transition-colors hover:bg-surface-muted ${
                  onRowClick
                    ? "cursor-pointer focus:outline-none focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                    : ""
                }`}
              >
                {/* min-w-0 wrapper + truncate — HolidayTable ke name column
                    jaisa. Column ki width nahi bandhi, bas lamba text kinare
                    par kat jaata hai. */}
                <td className="px-4 py-4 lg:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {task.title}
                    </p>
                    {/* {task.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-subtle">
                        {task.description}
                      </p>
                    )} */}

                    {/*
                      Wahi priority jo is chaudai par apne column se hat
                      chuki hai. lg:hidden — bilkul us breakpoint par gayab
                      jahan column wapas aata hai, isliye do baar kabhi nahi
                      dikhti aur beech mein kabhi gayab nahi hoti.
                    */}
                    <span className="mt-1.5 inline-block lg:hidden">
                      <TaskBadge
                        value={task.priority || "Medium"}
                        variant="priority"
                      />
                    </span>
                  </div>
                </td>

                {showAssignee && (
                  <td className="px-4 py-4 lg:px-6">
                    <span className="block truncate text-sm font-medium text-ink-muted">
                      {name}
                    </span>
                  </td>
                )}

                {/* whitespace-nowrap — warna "Aug 15, 2026" do line mein tootti */}
                <td className="whitespace-nowrap px-4 py-4 lg:px-6">
                  <span
                    className={`text-sm ${
                      overdue
                        ? "font-semibold text-red-600"
                        : "font-medium text-ink-muted"
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

                <td className="hidden px-4 py-4 lg:px-6 text-center lg:table-cell">
                  <TaskBadge value={task.priority || "Medium"} variant="priority" />
                </td>

                <td className="px-4 py-4 lg:px-6 text-center">
                  {/*
                    Badge hi dropdown ka trigger hai — pehle uske upar ek
                    paardarshi native <select> baithta tha, par uski khuli
                    hui list OS banata hai aur wo baaki UI se alag dikhti
                    thi. Ab list bhi apni hai (TaskSelect).

                    withCaret pill ke andar chevron laga deta hai — warna
                    badge bilkul static lagta hai.
                  */}
                  {/* inline-block — rok utni hi chaudai leti hai jitni pill,
                      baaki cell row ke click ke liye khula rehta hai */}
                  <span className="inline-block" {...stopRowActivation}>
                    {statusSelect(task)}
                  </span>
                </td>

                {/* Activity dekhna row kholne se alag hai — button apna
                    event khud rok leta hai (RowAction), isliye uske aas-paas
                    ki khaali jagah par details khulti hai */}
                {showActivity && (
                  <td className="px-4 py-4 lg:px-6 text-center">
                    <RowAction
                      tone="activity"
                      title={`View activity of ${task.title}`}
                      onClick={() => onActivityClick(task)}
                      icon={<FiClock size={16} />}
                    />
                  </td>
                )}

                {showActions && (
                  // Edit/Delete apna event khud rokte hain, isliye cell par
                  // koi rok nahi — dash wali row bhi poori click ho jaati hai
                  <td className="whitespace-nowrap px-4 py-4 lg:px-6">
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
                          className="inline-flex h-9 w-9 items-center justify-center text-ink-faint"
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
          </tbody>
        </table>
      </div>
    </>
  );
}

export default TaskTable;
