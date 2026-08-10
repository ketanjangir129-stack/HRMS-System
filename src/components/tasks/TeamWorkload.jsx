import { FiUsers } from "react-icons/fi";
import { PROGRESS_BARS } from "../../utils/tasks/taskConstants";
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
        /*
        | Chhoti screen par table sirf isi box ke andar scroll hoga.
        |
        | Cells ke kinare par padding nahi (first:pl-0 / last:pr-0) — card
        | apna px-6 already deta hai, warna do baar padding lagti aur naam
        | card ke title se aage khisak jaata.
        */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 pb-3 font-semibold first:pl-0">Employee</th>
                <th className="px-3 pb-3 text-center font-semibold">Total</th>
                <th className="px-3 pb-3 text-center font-semibold">
                  In progress
                </th>
                <th className="px-3 pb-3 text-center font-semibold">
                  Completed
                </th>
                <th className="w-28 px-3 pb-3 font-semibold last:pr-0">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {workload.map((person) => {
                const donePercent = person.total
                  ? (person.completed / person.total) * 100
                  : 0;

                return (
                  <tr key={person.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-3 py-3 first:pl-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {person.name}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center text-sm font-bold text-slate-900">
                      {person.total}
                    </td>

                    <td className="px-3 py-3 text-center text-sm font-semibold text-blue-600">
                      {person.active}
                    </td>

                    <td className="px-3 py-3 text-center text-sm font-semibold text-emerald-600">
                      {person.completed}
                    </td>

                    <td className="px-3 py-3 last:pr-0">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
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
