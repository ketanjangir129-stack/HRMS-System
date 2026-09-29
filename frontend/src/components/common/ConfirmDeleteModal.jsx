import { useEffect, useState } from "react";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

function ConfirmDeleteModal({
    open,
    title = "Delete Confirmation",
    message = "Are you sure you want to delete this item?",
    itemName = "",
    note = "This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    onConfirm,
    onClose,
}) {
    const [deleting, setDeleting] = useState(false);

    //closing on escape key
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !deleting) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, [open, deleting, onClose]);

    if (!open) return null;

    const handleConfirm = async () => {
        try {
            setDeleting(true);
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            onClick={() => !deleting && onClose()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >

                <div className="mb-5 flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
                            <FiAlertTriangle />
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h2>

                    </div>

                    <button
                        onClick={onClose}
                        disabled={deleting}
                        title="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                        <FiX />
                    </button>

                </div>

                <p className="text-sm leading-relaxed text-slate-600">
                    {message}
                    {
                        itemName && (
                            <>
                                {" "}
                                <span className="font-semibold text-slate-900">
                                    {itemName}
                                </span>
                            </>
                        )
                    }
                </p>

                {
                    note && (
                        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {note}
                        </p>
                    )
                }

                <div className="mt-6 flex justify-end gap-3">

                    <button
                        onClick={onClose}
                        disabled={deleting}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 cursor-pointer"
                    >
                        <FiTrash2 className="text-[15px]" />
                        {deleting ? "Deleting..." : confirmText}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default ConfirmDeleteModal;
