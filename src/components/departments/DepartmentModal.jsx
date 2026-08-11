import { FiLayers, FiX } from "react-icons/fi";

function DepartmentModal({
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
            {/* `max-h-[90vh]` keeps the save button reachable on a short
                landscape phone screen. */}
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

                <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">

                    <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 sm:h-11 sm:w-11 sm:text-xl">
                            <FiLayers />
                        </div>

                        <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
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
                    Department Name
                </label>

                {/* `text-base` below `sm` stops iOS Safari zooming in on
                    focus, which fonts under 16px trigger. */}
                <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                        setValue(e.target.value)
                    }
                    placeholder="Department Name"
                    className={`w-full rounded-xl border p-3 text-base text-slate-900 sm:text-sm placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 ${
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

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer sm:w-auto"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 cursor-pointer"
                    >
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}

export default DepartmentModal;