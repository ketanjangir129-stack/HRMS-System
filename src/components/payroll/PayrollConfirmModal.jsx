import { useEffect } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Payroll Confirm Modal
|--------------------------------------------------------------------------
| The step between clicking Approve or Lock and it happening.
|
| Neither can be undone, and neither looks any different from Generate on the
| way in, so both are confirmed. The month being acted on is named in the
| dialog rather than left to the picker behind it: the whole page is driven
| by a month selector, and closing the wrong month is the mistake this is
| here to catch.
|
| It is a sibling of `ConfirmDeleteModal` rather than a use of it - that one
| is red, says "Delete" and reports itself as deleting, and dressing approval
| up in it would read as though something were being destroyed.
|--------------------------------------------------------------------------
*/

function PayrollConfirmModal({
  open,
  title,
  message,
  note,
  confirmText,
  confirmingText,
  confirming = false,
  tone = "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400",
  icon,
  onConfirm,
  onClose,
}) {

  useEffect(() => {

    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !confirming) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [open, confirming, onClose]);

  if (!open) return null;

  return (

    <div
      onClick={() => !confirming && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >

      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >

        <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700 sm:h-11 sm:w-11 sm:text-xl">
              {icon || <FiAlertTriangle />}
            </div>

            <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {title}
            </h2>

          </div>

          <button
            onClick={onClose}
            disabled={confirming}
            title="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX />
          </button>

        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          {message}
        </p>

        {note && (
          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {note}
          </p>
        )}

        {/* Half the width each on a phone, side by side from `sm` up. */}
        <div className="mt-6 flex justify-end gap-3">

          <button
            onClick={onClose}
            disabled={confirming}
            className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:flex-none transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:flex-none sm:px-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${tone}`}
          >
            {icon}
            {confirming ? confirmingText : confirmText}
          </button>

        </div>

      </div>

    </div>

  );

}

export default PayrollConfirmModal;
