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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-md rounded-2xl p-6">

                <h2 className="text-xl font-semibold mb-4">
                    {title}
                </h2>

                <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                        setValue(e.target.value)
                    }
                    placeholder="Department Name"
                    className="w-full border rounded-xl p-3 border-gray-300 focus:outline-none focus:border-gray-400"
                />
                {
                    error && (
                        <p className="mt-2 text-sm text-red-500">
                            {error}
                        </p>
                    )
                }

                <div className="flex justify-end gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="border px-4 py-2 rounded-xl border-gray-300 cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl cursor-pointer"
                    >
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}

export default DepartmentModal;