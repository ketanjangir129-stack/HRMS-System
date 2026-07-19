import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
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
                toast(result?.message || "Failed to approve onboarding.");
                return;
            }

            toast.success(
                result?.message || "Onboarding approved successfully."
            );
            navigate("/OnboardDashboard/OnBoardRequest");
        } catch (error) {
            console.error(error);
            toast("Failed to approve onboarding.");
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
    const DetailField = ({ label, value }) => (
        <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
                {label}
            </label>

            <div className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800">
                {value || "-"}
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow p-6">

            <button
                onClick={() =>
                    navigate("/OnboardDashboard/OnBoardRequest")
                }
                className="
                    inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium shadow-sm hover:bg-slate-50 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
                <FiArrowLeft size={18} />
                Back to Requests
            </button>
            {/* Basic Information  */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-semibold mb-6">
                    Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <DetailField
                        label="Employee ID"
                        value={request.id}
                    />

                    <DetailField
                        label="Employee Name"
                        value={request.employmentInfo?.name}
                    />

                    <DetailField
                        label="Email"
                        value={request.employmentInfo?.email}
                    />

                    <DetailField
                        label="Mobile"
                        value={request.employmentInfo?.mobile}
                    />

                    <DetailField
                        label="Department"
                        value={request.employmentInfo?.department}
                    />

                    <DetailField
                        label="Designation"
                        value={request.employmentInfo?.designation}
                    />

                </div>

            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">

                <h2 className="text-xl font-semibold mb-6">
                    Personal Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <DetailField
                        label="Father Name"
                        value={request.personalInfo?.fatherName}
                    />

                    <DetailField
                        label="Mother Name"
                        value={request.personalInfo?.motherName}
                    />

                    <DetailField
                        label="Date of Birth"
                        value={request.personalInfo?.dob}
                    />

                    <DetailField
                        label="Gender"
                        value={request.personalInfo?.gender}
                    />

                    <DetailField
                        label="Marital Status"
                        value={request.personalInfo?.maritalStatus}
                    />

                    <DetailField
                        label="Personal Mobile"
                        value={request.personalInfo?.personalMobile}
                    />

                    <DetailField
                        label="Alternate Mobile"
                        value={request.personalInfo?.alternateMobile}
                    />

                    <DetailField
                        label="City"
                        value={request.personalInfo?.city}
                    />

                    <DetailField
                        label="State"
                        value={request.personalInfo?.state}
                    />

                    <DetailField
                        label="Pincode"
                        value={request.personalInfo?.pincode}
                    />

                </div>

                <div className="mt-5">

                    <DetailField
                        label="Address"
                        value={request.personalInfo?.address}
                    />

                </div>

            </div>

            {/* Bank Information  */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">

                <h2 className="text-xl font-semibold mb-6">
                    Bank Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <DetailField
                        label="Account Holder Name"
                        value={request.bankInfo?.accountHolderName}
                    />

                    <DetailField
                        label="Bank Name"
                        value={request.bankInfo?.bankName}
                    />

                    <DetailField
                        label="Account Number"
                        value={request.bankInfo?.accountNumber}
                    />

                    <DetailField
                        label="IFSC Code"
                        value={request.bankInfo?.ifscCode}
                    />

                    <DetailField
                        label="Branch Name"
                        value={request.bankInfo?.branchName}
                    />

                </div>

            </div>

            {/* KYC Information  */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
                <h2 className="text-xl font-semibold mb-6">
                    KYC Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <DetailField
                        label="Aadhaar Number"
                        value={request.documents?.aadhaarNumber}
                    />

                    <DetailField
                        label="PAN Number"
                        value={request.documents?.panNumber}
                    />

                    <DetailField
                        label="UAN Number"
                        value={request.documents?.uanNumber}
                    />

                    <DetailField
                        label="ESIC Number"
                        value={request.documents?.esicNumber}
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

