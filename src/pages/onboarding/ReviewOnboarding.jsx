import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getOnboardingRequestById } from "../../services/OnboardingService";
import Loader from "../../components/common/Loader";
import { approveOnboarding, rejectOnboarding } from "../../services/ApprovalService";
import RejectModal from "../../pages/onboarding/RejectModal";
import { toast } from "react-toastify";

function ReviewOnboarding() {
    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);

    const companyCode = localStorage.getItem("companyCode");

    const approvedBy =
        localStorage.getItem("username") ||
        localStorage.getItem("userName") ||
        localStorage.getItem("name") ||
        "Admin";
    const [showRejectModal, setShowRejectModal] = useState(false);

    const [loadingReject, setLoadingReject] = useState(false);
    const loadRequest = async () => {
        try {
            const data = await getOnboardingRequestById(companyCode, requestId);
            setRequest(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            const result = await approveOnboarding(companyCode, requestId, approvedBy);

            if (!result?.success) {
                alert(result?.message || "Failed to approve onboarding.");
                return;
            }

            navigate("/OnboardDashboard/OnBoardRequest");
        } catch (error) {
            console.error(error);
            alert("Failed to approve onboarding.");
        } finally {
            setApproving(false);
        }
    };
    const handleReject = async (remarks) => {
        if (!request?.id) return;

        setLoadingReject(true);
        try {
            const result = await rejectOnboarding(
                companyCode,
                request.id,
                remarks,
                approvedBy
            );

            if (result.success) {
                toast.success(result.message);
                setShowRejectModal(false);
                navigate("/onboarding/requests");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject request.");
        } finally {
            setLoadingReject(false);
        }
    };

    useEffect(() => {
        loadRequest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <Loader />;
    }

    if (!request) {
        return (
            <div className="p-8">
                Request not found.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="font-medium">Employee ID</label>
                    <input
                        value={request.id}
                        readOnly
                        className="w-full border rounded-lg p-3"
                    />
                </div>

                <div>
                    <label className="font-medium">Employee Name</label>
                    <input
                        value={request.basic?.name || ""}
                        readOnly
                        className="w-full border rounded-lg p-3"
                    />
                </div>

                <div>
                    <label className="font-medium">Email</label>
                    <input
                        value={request.basic?.email || ""}
                        readOnly
                        className="w-full border rounded-lg p-3"
                    />
                </div>

                <div>
                    <label className="font-medium">Mobile</label>
                    <input
                        value={request.basic?.mobile || ""}
                        readOnly
                        className="w-full border rounded-lg p-3"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg"
                >
                    Reject
                </button>

                <button
                    onClick={handleApprove}
                    disabled={approving}
                    className={
                        `px-6 py-3 rounded-lg text-white hover:bg-green-700 ` +
                        (approving ? "bg-green-400 cursor-not-allowed" : "bg-green-600")
                    }
                >
                    {approving ? "Approving..." : "Approve"}
                </button>
            </div>
            <RejectModal
                isOpen={showRejectModal}
                loading={loadingReject}
                onClose={() => setShowRejectModal(false)}
                onConfirm={handleReject}
            />
        </div>

    );
}

export default ReviewOnboarding;

