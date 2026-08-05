import { FiX, FiTrash2, FiLoader } from "react-icons/fi";

function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  request = null,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Delete Request
              </h2>
              <p className="text-sm text-slate-500">
                {request?.requestId || "Attendance request"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this attendance request?
            {request?.employeeName ? (
              <>
                {" "}
                <span className="font-semibold text-slate-800">
                  {request.employeeName}
                </span>
                {"'s "}
                <span className="font-semibold text-slate-800">
                  {request.type}
                </span>{" "}
                request will be permanently removed.
              </>
            ) : (
              " This action cannot be undone."
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <FiLoader className="animate-spin" />}
            {loading ? "Deleting..." : "Delete Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
