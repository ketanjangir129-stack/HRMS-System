import { useState } from "react";
import { FiAlertCircle, FiLoader, FiX } from "react-icons/fi";

function RejectClaimModal({ open, onClose, onConfirm, loading = false, employeeName = "", claimTitle = "" }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const isEmpty = !reason.trim();

  if (!open) return null;

  const handleReject = () => {
    setTouched(true);
    if (isEmpty) return;
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason("");
    setTouched(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FiAlertCircle size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="ui-card-title">Reject Claim</h2>
              <p className="truncate text-sm text-ink-subtle">
                {employeeName ? `${employeeName} · ` : ""}{claimTitle || "Reimbursement claim"}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                The whole claim is rejected — a trip with one mismatched bill cannot be partly approved.
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} disabled={loading} aria-label="Close" className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <label className="ui-eyebrow mb-1.5 block">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Explain which bill / amount mismatched and why..."
            className="w-full resize-none rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-red-500 focus:bg-surface focus:ring-2 focus:ring-red-100"
          />
          {touched && isEmpty && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <FiAlertCircle />
              A reason is required to reject this claim.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={loading} className="ui-btn ui-btn-secondary font-semibold">
            Cancel
          </button>
          <button type="button" onClick={handleReject} disabled={loading} className="ui-btn bg-red-600 font-semibold text-white shadow-sm hover:bg-red-700">
            {loading && <FiLoader className="animate-spin" />}
            {loading ? "Rejecting..." : "Reject Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectClaimModal;
