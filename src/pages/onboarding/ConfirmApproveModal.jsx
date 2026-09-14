import { useEffect } from "react";
import { FiCheckCircle, FiUserCheck, FiX } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Confirm Approve
|--------------------------------------------------------------------------
| Approving in bulk creates an employee record per request and deletes the
| request behind it, so it asks first. The shape follows ConfirmDeleteModal —
| same layout, same escape key, in the green the approve action already uses
| everywhere else.
|--------------------------------------------------------------------------
*/

function ConfirmApproveModal({
    open,
    title = "Approve Confirmation",
    message = "Are you sure you want to approve these onboarding requests?",
    note = "Approved requests become employees and leave this list.",
    confirmText = "Approve",
    loadingText = "Approving...",
    cancelText = "Cancel",
    loading = false,
    onConfirm,
    onClose,
}) {

    // Closing on escape key, but never mid-run.
    useEffect(() => {

        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);

    }, [open, loading, onClose]);

    if (!open) return null;

    return (
        <div
            onClick={() => !loading && onClose()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >

                <div className="mb-5 flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                            <FiUserCheck />
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h2>

                    </div>

                    <button
                        onClick={onClose}
                        disabled={loading}
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
                    <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        {note}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-3">

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <FiCheckCircle className="text-[15px]" />
                        {loading ? loadingText : confirmText}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default ConfirmApproveModal;
