import { useState } from "react";
import { FiAlertCircle, FiLoader, FiX } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Reject Request
|--------------------------------------------------------------------------
| Rejecting always needs a reason, so nothing is ever turned down without the
| employee being told why.
|
| The wording is overridable because the same box turns down two different
| things: a correction request, and a day of attendance that was not
| approved. Both need exactly one thing from the reviewer - the reason - and
| the defaults are the request wording every existing caller already passes
| nothing for.
|--------------------------------------------------------------------------
*/

function RejectForm({
  onClose,
  onConfirm,
  loading = false,
  employeeName = "",
  title = "Reject Request",
  subject = "attendance request",
  confirmLabel = "Reject Request",
  loadingLabel = "Rejecting...",
  placeholder = "Enter the reason for rejecting this request...",
}) {

  const [remarks, setRemarks] = useState("");
  const [touched, setTouched] = useState(false);

  const isEmpty = !remarks.trim();

  const handleReject = () => {

    setTouched(true);

    if (isEmpty) return;

    onConfirm(remarks.trim());

  };

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`,
    | so the remarks box sits directly above the keyboard rather than behind
    | it.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FiAlertCircle size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <p className="truncate text-sm text-slate-500">
                {employeeName
                  ? `${employeeName}'s ${subject}`
                  : subject.charAt(0).toUpperCase() + subject.slice(1)}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Remarks <span className="text-red-500">*</span>
          </label>

          <textarea
            rows={5}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
          />

          {touched && isEmpty && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <FiAlertCircle />
              Remarks are required to reject this {subject}.
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <FiLoader className="animate-spin" />}
            {loading ? loadingLabel : confirmLabel}
          </button>

        </div>

      </div>

    </div>
  );

}

/*
| The form only exists while the modal is open, so the previous rejection
| reason is never pre-filled for the next request.
*/

function RejectRequestModal({ open, ...props }) {

  if (!open) return null;

  return <RejectForm {...props} />;

}

export default RejectRequestModal;
