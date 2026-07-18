import { useState } from "react";

function RejectModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
}) {
    const [remarks, setRemarks] = useState("");

    if (!isOpen) return null;

    const handleReject = () => {
        if (!remarks.trim()) return;

        onConfirm(remarks);

        setRemarks("");
    };

    const handleClose = () => {
        setRemarks("");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-xl font-bold mb-4">
                    Reject Onboarding Request
                </h2>

                <label className="block mb-2 font-medium">
                    Remarks
                </label>

                <textarea
                    rows={5}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full border rounded-lg p-3 resize-none"
                />

                {!remarks.trim() && (
                    <p className="text-red-500 text-sm mt-1">
                        Remarks are required.
                    </p>
                )}

                <div className="flex justify-end gap-3 mt-6">

                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-5 py-2 border rounded-lg hover:bg-gray-100"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleReject}
                        disabled={!remarks.trim() || loading}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                    >
                        {loading ? "Rejecting..." : "Reject"}
                    </button>

                </div>

            </div>

        </div>
    );
}

export default RejectModal;