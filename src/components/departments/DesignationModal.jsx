import { FiBriefcase, FiX } from "react-icons/fi";

function DesignationtModal({
    open,
    value,
    setValue,
    title,
    error,
    onClose,
    onSave,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

                <div className="mb-5 flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                            <FiBriefcase />
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h2>

                    </div>

                    <button
                        onClick={onClose}
                        title="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                    >
                        <FiX />
                    </button>

                </div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Designation Name
                </label>

                <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                        setValue(e.target.value)
                    }
                    placeholder="Designation Name"
                    className={`w-full rounded-xl border p-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 ${
                        error
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                            : "border-slate-200 focus:border-blue-400 focus:ring-blue-200"
                    }`}
                />
                {
                    error && (
                        <p className="mt-2 text-sm text-red-500">
                            {error}
                        </p>
                    )
                }

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 cursor-pointer"
                    >
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}

export default DesignationtModal;