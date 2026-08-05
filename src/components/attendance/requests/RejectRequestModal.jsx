import { useState } from "react";
import { FiX, FiAlertCircle, FiLoader } from "react-icons/fi";

function RejectRequestModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  employeeName = "",
}) {
  const [remarks, setRemarks] = useState("");

  if (!open) return null;

  const handleReject = () => {
    if (!remarks.trim()) return;
    onConfirm(remarks.trim());
  };

  const handleClose = () => {
    setRemarks("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FiAlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Reject Request
              </h2>
              <p className="text-sm text-slate-500">
                {employeeName
                  ? `${employeeName}'s attendance request`
                  : "Attendance request"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
          />
          {!remarks.trim() && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <FiAlertCircle />
              Remarks are required to reject this request.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            onClick={handleClose}
            disabled={loading}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={!remarks.trim() || loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <FiLoader className="animate-spin" />}
            {loading ? "Rejecting..." : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectRequestModal;
