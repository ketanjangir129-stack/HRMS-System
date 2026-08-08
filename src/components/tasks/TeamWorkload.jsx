import { FiUsers } from "react-icons/fi";
import { PROGRESS_BARS } from "../../utils/tasks/taskConstants";
import { initials } from "../../utils/tasks/taskUtils";
import TaskSectionCard from "./TaskSectionCard";

/*
|--------------------------------------------------------------------------
| Team Workload
|--------------------------------------------------------------------------
| Employee-wise load. Rows taskUtils.js ke teamWorkload() se banti hain —
| sirf un logon ki jinke paas task hai.
|
| Naam employees list se aata hai (wahi list jo page already Assignee column
| aur Create form ke liye laata hai) — koi naya Firebase call nahi.
|--------------------------------------------------------------------------
*/

function TeamWorkload({ workload, className = "" }) {
  return (
    <TaskSectionCard
      className={className}
      title="Team workload"
      subtitle={
        workload.length
          ? `${workload.length} ${
              workload.length === 1 ? "person" : "people"
            } with assigned work`
          : "Assigned work per person"
      }
      icon={<FiUsers />}
    >
      {workload.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No tasks assigned to anyone yet.
        </p>
      ) : (
        // Chhoti screen par table sirf isi box ke andar scroll hoga,
        // poora page side mein nahi khisakta
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[520px] text-left">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 px-4 text-center">Total</th>
                <th className="pb-3 px-4 text-center">In progress</th>
                <th className="pb-3 px-4 text-center">Completed</th>
                <th className="w-32 pb-3 pl-4">Progress</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {workload.map((person) => {
                const donePercent = person.total
                  ? (person.completed / person.total) * 100
                  : 0;

                return (
                  <tr key={person.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                          {initials(person.name)}
                        </span>
                        <span className="truncate text-sm font-medium text-slate-700">
                          {person.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                      {person.total}
                    </td>

                    <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">
                      {person.active}
                    </td>

                    <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-600">
                      {person.completed}
                    </td>

                    <td className="py-3 pl-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${donePercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${PROGRESS_BARS.Completed}`}
                        />
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {Math.round(donePercent)}% done
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </TaskSectionCard>
  );
}

export default TeamWorkload;
