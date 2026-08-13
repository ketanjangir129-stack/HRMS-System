import { useEffect } from "react";
import { Loader2, Trash2, X } from "lucide-react";

/*
|--------------------------------------------------------------------------
| Delete Task Modal
|--------------------------------------------------------------------------
| window.confirm ki jagah — baaki app jaisa dikhne wala confirmation.
| Khud delete nahi karta, sirf onConfirm bula deta hai.
|--------------------------------------------------------------------------
*/

function DeleteTaskModal({ open, task, deleting, onConfirm, onClose }) {
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
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>
            <div>
              <h2
                id="delete-task-title"
                className="text-lg font-semibold text-slate-900"
              >
                Delete task
              </h2>
              <p className="text-sm text-slate-500">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/*
            Header already keh chuka hai ki ye wapas nahi hoga, isliye yahan
            wo baat dobara nahi — bas kaunsa task ja raha hai aur kiske liye.
          */}
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">
              {task?.title || "This task"}
            </span>{" "}
            will be removed for everyone.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTaskModal;
