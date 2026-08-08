import { FiAlertTriangle, FiPieChart } from "react-icons/fi";
import { PROGRESS_BARS } from "../../utils/tasks/taskConstants";
import TaskSectionCard from "./TaskSectionCard";

/*
|--------------------------------------------------------------------------
| Task Progress
|--------------------------------------------------------------------------
| Teen status ka distribution ek stacked bar mein — inka jod hamesha total
| hota hai, isliye ye theek se 100% banate hain.
|
| Overdue neeche apni alag "attention" row mein hai. Wo chautha status nahi
| hai — pending tasks ke andar ka subset hai, isliye uska % bhi pending ke
| against dikhta hai. Ginti taskUtils.js ke taskProgress() se aati hai.
|
| Koi chart library nahi — bars wahi Tailwind wale hain jo TaskSummaryCards
| mein already use hote hain.
|--------------------------------------------------------------------------
*/

function TaskProgress({ progress }) {
  const { total, pending, completionRate, segments, overdue, overduePercent } =
    progress;

  return (
    <TaskSectionCard
      title="Task progress"
      subtitle={`${completionRate}% of all tasks completed`}
      icon={<FiPieChart />}
    >
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No tasks to measure yet.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Stacked bar — teen segment, jod poora 100% */}
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {segments.map((segment) => (
              <div
                key={segment.label}
                // share bina round kiya hua hai, warna teen rounded percent
                // jodne par bar mein patli si khaali lakeer reh jaati hai
                style={{ width: `${segment.share}%` }}
                title={`${segment.label}: ${segment.value}`}
                className={`h-full transition-all duration-500 ${
                  PROGRESS_BARS[segment.label]
                }`}
              />
            ))}
          </div>

          {/* Legend — har status ka count aur % */}
          <div className="space-y-4">
            {segments.map((segment) => (
              <div key={segment.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        PROGRESS_BARS[segment.label]
                      }`}
                    />
                    {segment.label}
                  </span>

                  <span className="font-semibold text-slate-900">
                    {segment.value}
                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                      {segment.percent}%
                    </span>
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${segment.share}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      PROGRESS_BARS[segment.label]
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overdue — status nahi, isliye bar se bahar apni row mein */}
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-red-500">
              <FiAlertTriangle size={17} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-red-700">Overdue</p>
                <p className="text-sm font-bold text-red-700">{overdue}</p>
              </div>

              <p className="mt-0.5 text-xs font-medium text-red-500">
                {pending === 0
                  ? "Nothing pending"
                  : `${overduePercent}% of ${pending} pending task${
                      pending === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>
        </div>
      )}
    </TaskSectionCard>
  );
}

export default TaskProgress;
