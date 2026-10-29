import { useEffect } from "react";
import { Archive, Loader2, Trash2, X } from "lucide-react";

/*
|--------------------------------------------------------------------------
| Archive / Delete Task Modal
|--------------------------------------------------------------------------
| Do kaam, ek shakal:
|   archive  — task list se hat-ta hai, history bachi rehti hai, wapas aa
|              sakta hai (Archived tab se). Ye default hai.
|   delete   — hamesha ke liye, task aur uski poori history. Sirf Owner,
|              aur sirf Archived tab se.
|
| count > 1 ho to bulk archive — wahi modal, gintī ke saath.
|--------------------------------------------------------------------------
*/

function DeleteTaskModal({
  open,
  task,
  count = 1,
  permanent = false,
  deleting,
  onConfirm,
  onClose,
}) {
  // Escape se band, aur peeche ka page scroll na ho
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, deleting, onClose]);

  if (!open) return null;

  const many = count > 1;
  const name = many ? `${count} tasks` : task?.title || "This task";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={() => !deleting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-task-title"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="ui-tile ui-tile-sm bg-red-50 text-red-600">
              {permanent ? <Trash2 size={20} /> : <Archive size={20} />}
            </div>
            <div>
              <h2 id="delete-task-title" className="ui-card-title">
                {permanent ? "Delete permanently" : many ? "Archive tasks" : "Archive task"}
              </h2>
              <p className="text-sm text-ink-subtle">
                {permanent
                  ? "This action cannot be undone."
                  : "You can restore it later from the Archived tab."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{name}</span>{" "}
            {permanent
              ? "and all of its history, steps and comments will be removed for everyone."
              : `will be removed from everyone's list. ${many ? "Their" : "Its"} history is kept.`}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="ui-btn ui-btn-secondary"
          >
            Cancel
          </button>

          {/* Destructive — kit ka shape, par fill red, kyunki ye brand ka
              kaam nahi hai */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="ui-btn bg-red-600 text-white shadow-sm hover:bg-red-700"
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {deleting
              ? permanent ? "Deleting..." : "Archiving..."
              : permanent ? "Delete permanently" : many ? `Archive ${count} tasks` : "Archive task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTaskModal;
