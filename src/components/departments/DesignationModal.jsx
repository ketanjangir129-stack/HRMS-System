function DepartmentModal({
    open,
    value,
    setValue,
    title,
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
                    placeholder="Designation Name"
                    className="w-full border rounded-xl p-3"
                />

                <div className="flex justify-end gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="border px-4 py-2 rounded-xl"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl"
                    >
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}

export default DepartmentModal;