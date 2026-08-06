import { useState } from "react";
import { FiAlertCircle, FiLoader, FiX } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Reject Leave Request
|--------------------------------------------------------------------------
| Rejecting always needs a reason, so a leave application is never turned
| down without the employee being told why.
|--------------------------------------------------------------------------
*/

function RejectForm({
  onClose,
  onConfirm,
  loading = false,
  employeeName = "",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FiAlertCircle size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="text-lg font-semibold text-slate-900">
                Reject Leave
              </h2>

              <p className="truncate text-sm text-slate-500">
                {employeeName
                  ? `${employeeName}'s leave request`
                  : "Leave request"}
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
        <div className="p-6">

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Remarks <span className="text-red-500">*</span>
          </label>

          <textarea
            rows={5}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Enter the reason for rejecting this leave request..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
          />

          {touched && isEmpty && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <FiAlertCircle />
              Remarks are required to reject this request.
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">

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
            {loading ? "Rejecting..." : "Reject Leave"}
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

function RejectLeaveModal({ open, ...props }) {

  if (!open) return null;

  return <RejectForm {...props} />;

}

export default RejectLeaveModal;
