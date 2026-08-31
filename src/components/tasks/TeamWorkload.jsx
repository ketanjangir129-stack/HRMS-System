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
        <p className="py-4 text-center text-sm text-ink-faint">
          No tasks assigned to anyone yet.
        </p>
      ) : (
        /*
        | Chhoti screen par table sirf isi box ke andar scroll hoga.
        |
        | -mx-6 card ka apna px-6 wapas kaat deta hai, taaki table card ke
        | dono kinare tak pahunche. Padding wapas cells par aati hai
        | (first:pl-6 / last:pr-6) — matlab naam wahin rehta hai jahan pehle
        | tha, card ke title ke seedhe neeche, lekin sticky header ki patti
        | ab pooree chaudai mein phailti hai.
        |
        | Yeh farq tabhi dikhta hai jab patti ka apna background ho: pehle
        | wo table ki edge par khatam hoti thi aur "Employee" bilkul uske
        | kinare se chipka hua lagta tha.
        */
        <div className="hide-scrollbar -mx-6 max-h-64 overflow-x-auto overflow-y-auto">
          {/*
            Phone par koi min-w nahi — teen column (naam, total, progress)
            jitni jagah hai usi mein sikud jaate hain, isliye scrollbar aata
            hi nahi. min-w sirf sm se lagti hai, jahan do chhipe hue column
            wapas aate hain aur unhe jagah chahiye hoti hai.

            468 = 420 + 48, kyunki pehla aur aakhri cell ab 24px padding
            khud uthate hain. Column ko jagah utni hi milti hai jitni pehle
            420 par milti thi.
          */}
          <table className="w-full border-collapse text-left sm:min-w-[468px]">
            {/*
              Sticky — scroll karte waqt column ke naam upar tike rehte hain,
              warna neeche jaate hi sirf ginti reh jaati aur pata nahi chalta
              ki kaunsa number kis column ka hai.

              Border ki jagah inset shadow: table border-collapse hai, aur
              collapsed border sticky element ke saath nahi chipakta — wo
              table ke saath scroll ho jaata hai. Shadow th par lagti hai,
              isliye wo header ke saath hi tiki rehti hai.
            */}
            <thead className="sticky top-0 z-10 text-xs uppercase tracking-wide text-ink-subtle [&_th]:bg-surface-raised [&_th]:shadow-[inset_0_-1px_0_0_var(--color-line)]">
              <tr>
                <th className="px-3 py-2 font-semibold first:pl-6">Employee</th>
                <th className="px-3 py-2 text-center font-semibold">Total</th>
                <th className="hidden px-3 py-2 text-center font-semibold sm:table-cell">
                  In progress
                </th>
                <th className="hidden px-3 py-2 text-center font-semibold sm:table-cell">
                  Completed
                </th>
                {/* Phone par patli — min-w hatne ke baad jo jagah bachti hai
                    wo naam ko milni chahiye, warna wo jaldi kat jaata hai */}
                <th className="w-20 px-3 py-2 font-semibold last:pr-6 sm:w-28">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line-subtle">
              {workload.map((person) => {
                const donePercent = person.total
                  ? (person.completed / person.total) * 100
                  : 0;

                return (
                  <tr
                    key={person.id}
                    className="transition-colors hover:bg-surface-muted"
                  >
                    <td className="px-3 py-2.5 first:pl-6">
                      <span className="block truncate text-sm font-medium text-ink-muted">
                        {person.name}
                      </span>

                      {/*
                        Wahi do ginti jo is chaudai par apne column se hat
                        chuki hain. sm:hidden — bilkul us breakpoint par
                        gayab jahan columns wapas aate hain, isliye kabhi do
                        baar nahi dikhtin. Rang bhi wahi jo unke column ka
                        hai, taaki dono jagah ek hi bhasha rahe.
                      */}
                      <span className="mt-0.5 block space-y-0.5 text-xs sm:hidden">
                        <span className="block">
                          <span className="font-semibold text-blue-600">
                            {person.active}
                          </span>
                          <span className="text-ink-faint"> in progress</span>
                        </span>

                        <span className="block">
                          <span className="font-semibold text-emerald-600">
                            {person.completed}
                          </span>
                          <span className="text-ink-faint"> completed</span>
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-center text-sm font-bold text-ink">
                      {person.total}
                    </td>

                    <td className="hidden px-3 py-2.5 text-center text-sm font-semibold text-blue-600 sm:table-cell">
                      {person.active}
                    </td>

                    <td className="hidden px-3 py-2.5 text-center text-sm font-semibold text-emerald-600 sm:table-cell">
                      {person.completed}
                    </td>

                    <td className="px-3 py-2.5 last:pr-6">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                        <div
                          style={{ width: `${donePercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${PROGRESS_BARS.Completed}`}
                        />
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-ink-faint">
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
