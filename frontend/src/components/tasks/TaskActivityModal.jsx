import { useEffect, useState } from "react";
import { Clock, Timer, X } from "lucide-react";
import { formatDuration, taskTimeSpent } from "../../utils/tasks/taskUtils";
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
|
| Upar "Time spent" — wo bhi inhi entries se gina jaata hai, Firebase mein
| kahin store nahi hota.
|--------------------------------------------------------------------------
*/

// Chalu task ka waqt badhta rehta hai. Minute se chhota kuch dikhta nahi,
// isliye minute mein ek baar hi ginti dobara karni padti hai.
const TICK_MS = 60000;

/*
|--------------------------------------------------------------------------
| Time Spent
|--------------------------------------------------------------------------
| Apna component isliye hai ki "abhi kitna baja hai" iske mount hone par
| tay ho — aur ye tabhi mount hota hai jab modal khulta hai.
|
| Modal khud page ke saath hi mount ho jaata hai (band hone par sirf null
| return karta hai). Waqt wahan rakhte to wo ek hi baar banta — page khulne
| ka waqt. Subah page kholkar shaam ko modal kholne par ginti subah ke
| hisaab se banti, aur ek minute baad pehle tick par achanak sahi value par
| kood jaati.
|
| Yahan ye dikkat hai hi nahi: modal band hote hi ye unmount ho jaata hai,
| aur khulte hi naya Date.now() leta hai.
*/
function TimeSpent({ entries }) {
  const [now, setNow] = useState(() => Date.now());

  const time = taskTimeSpent(entries, now);

  // Ghadi sirf chalu task par — ruke hue ka waqt badhta nahi, to har minute
  // render karne ka koi matlab nahi
  useEffect(() => {
    if (!time.running) return;

    const id = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(id);
  }, [time.running]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted/70 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-subtle ring-1 ring-line">
        <Timer size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="ui-eyebrow">Time spent</p>
        <p className="mt-0.5 text-sm font-bold text-ink">
          {formatDuration(time.total)}
        </p>
      </div>

      {/* Chalu hai to wo batana zaroori hai — warna ginti kam lagti hai aur
          pata nahi chalta ki abhi badh rahi hai */}
      {time.running && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Running
        </span>
      )}
    </div>
  );
}

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
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="ui-tile ui-tile-sm bg-brand-ring text-brand">
              <Clock size={20} />
            </div>

            <div className="min-w-0">
              <h2 id="task-activity-title" className="ui-card-title">
                Activity
              </h2>
              {/* Kis task ki activity hai — modal table se khulta hai, to
                  context yahan hona zaroori hai */}
              <p className="truncate text-sm text-ink-subtle">{task.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — lambi history par yahi hissa scroll hota hai */}
        <div className="ui-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="py-6 text-center text-sm text-ink-faint">
              Loading activity...
            </p>
          ) : (
            <>
              {/*
                Time spent sabse upar — yahi wo ek line hai jiske liye
                zyadatar log ye modal kholte hain. Timeline uske peeche ka
                hisaab hai.

                Entry hi na ho to ye tile bhi nahi — tab kaam shuru hi nahi
                hua, aur "0m" likhna kuch batata nahi.
              */}
              {entries.length > 0 && <TimeSpent entries={entries} />}

              <TaskActivity entries={entries} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskActivityModal;
