import { FiPause } from "react-icons/fi";
import { formatDuration } from "../../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| Task Working Bar
|--------------------------------------------------------------------------
| "Abhi kya chal raha hai" — Tasks page ke upar, sirf tab jab main kisi task
| (ya step) par kaam kar raha hoon. Ek nazar mein task, step, kitni der se,
| aur ek click mein Stop.
|
| Waqt "now - since" hai — since server ki ghadi ka hai, page bas aage
| ginta hai.
|--------------------------------------------------------------------------
*/

function TaskWorkingBar({ task, step, since, now, onStop, onOpen }) {
  if (!task) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 cursor-pointer text-left"
        title="Open this task"
      >
        <p className="truncate text-sm font-semibold text-emerald-900">
          Working on: {task.title}
        </p>
        {step?.title && (
          <p className="truncate text-xs text-emerald-800">Step: {step.title}</p>
        )}
      </button>

      <span className="text-lg font-bold tabular-nums text-emerald-900">
        {formatDuration(Math.max(0, now - since))}
      </span>

      <button
        type="button"
        onClick={onStop}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <FiPause size={14} />
        Stop
      </button>
    </div>
  );
}

export default TaskWorkingBar;
