import { useState } from "react";

/*
| One remarks box, used for a single request and for a whole batch. The batch
| passes its own heading and the line that says how many requests the remarks
| are about to be written onto; everything else is identical, which is why
| there is one modal rather than two.
*/
function RejectModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
    title = "Reject Onboarding Request",
    description = "",
    confirmText = "Reject",
    loadingText = "Rejecting...",
}) {
    const [remarks, setRemarks] = useState("");

    /*
    | The remarks are not cleared when Reject is pressed: the box stays
    | readable for as long as the request is in flight, and a rejection that
    | failed leaves the reason still typed to try again. Both callers mount
    | this only while it is open, so a fresh one starts empty.
    */
    if (!isOpen) return null;

    const handleReject = () => {
        if (!remarks.trim()) return;

        onConfirm(remarks);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-xl font-bold mb-4">
                    {title}
                </h2>

                {description && (
                    <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {description}
                    </p>
                )}

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
                        {loading ? loadingText : confirmText}
                    </button>

                </div>

            </div>

        </div>
    );
}

export default RejectModal;