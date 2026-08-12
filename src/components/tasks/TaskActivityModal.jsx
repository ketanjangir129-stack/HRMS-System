import { useEffect } from "react";
import { Clock, X } from "lucide-react";
import TaskActivity from "./TaskActivity";

/*
|--------------------------------------------------------------------------
| Task Activity Modal
|--------------------------------------------------------------------------
| Ek task ke saath kya-kya hua. Table ke Activity column se khulta hai.
|
| Details modal jaisa hi dhaancha: header aur footer tike rehte hain, beech
| ka hissa scroll hota hai. Poori list yahan aati hai (koi limit nahi),
| isliye lambi history par yahi hissa chalega.
|
| Timeline khud nahi banata — wahi TaskActivity component use hota hai.
| Firebase se yahan koi baat nahi hoti: task aur entries dono page ki state
| se aate hain, aur wo dono realtime hain — isliye modal khula rehte hue
| nayi entry apne aap upar aa jaati hai.
|
| loading tab dikhta hai jab records se pehli baar entries aa rahi hon.
| Pehle activity task ke saath hi aa jaati thi, ab uska apna listener hai —
| bina iske ek pal ke liye "No activity yet" jhalak jaata hai.
|--------------------------------------------------------------------------
*/

function TaskActivityModal({ open, task, entries = [], loading = false, onClose }) {
  // Escape se band, aur peeche ka page scroll na ho
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  /*
  | task null ho sakta hai — realtime listener se delete ho jaye to page
  | usko null kar deta hai aur modal apne aap band ho jaata hai. Wahi tehen
  | jo TaskDetailsModal ki hai.
  */
  if (!open || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-activity-title"
    >
      {/* Andar click karne par modal band na ho */}
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock size={20} />
            </div>

            <div className="min-w-0">
              <h2
                id="task-activity-title"
                className="text-lg font-semibold text-slate-900"
              >
                Activity
              </h2>
              {/* Kis task ki activity hai — modal table se khulta hai, to
                  context yahan hona zaroori hai */}
              <p className="truncate text-sm text-slate-500">{task.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — lambi history par yahi hissa scroll hota hai */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Loading activity...
            </p>
          ) : (
            <TaskActivity entries={entries} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskActivityModal;
