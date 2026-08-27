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
  tone = "ui-btn-primary",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4"
    >
 
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
      >
 
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
 
          <div className="flex min-w-0 items-center gap-3">
 
            <div className="ui-tile ui-tile-sm bg-surface-muted text-lg text-ink-muted">
              {icon || <FiAlertTriangle />}
            </div>
 
            <h2 className="ui-card-title">
              {title}
            </h2>
 
          </div>
 
          <button
            onClick={onClose}
            disabled={confirming}
            title="Close"
            className="ui-icon-btn h-8 w-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX />
          </button>
 
        </div>
 
        <p className="text-sm leading-relaxed text-ink-muted">
          {message}
        </p>
 
        {note && (
          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {note}
          </p>
        )}
 
        {/*
        | Stacked on a phone with the action on top, which is the order
        | `flex-col-reverse` gives the same markup that reads Cancel then
        | confirm on a wide screen.
        */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
 
          <button
            onClick={onClose}
            disabled={confirming}
            className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
          >
            Cancel
          </button>
 
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`ui-btn w-full font-semibold sm:w-auto ${tone}`}
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
 
 