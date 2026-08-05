import { useEffect, useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRequestList from "../../components/attendance/requests/AttendanceRequestList";
import AttendanceRequestModal from "../../components/attendance/requests/AttendanceRequestModal";
import AttendanceRequestDetailModal from "../../components/attendance/requests/AttendanceRequestDetailModal";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
import ConfirmDeleteModal from "../../components/attendance/requests/ConfirmDeleteModal";
import useAuth from "../../hooks/useAuth";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";

function AttendanceRequests() {
  const { company, currentUser } = useAuth();
  const companyCode = company?.companyCode;
  const { search, setSearch, setSearchPlaceholder } = useOutletContext();
  const { requests, loading, create, update, approve, reject, remove } =
    useAttendanceRequests(companyCode);

  // Header search placeholder integration
  useEffect(() => {
    setSearchPlaceholder("Search attendance requests...");
    return () => {
      setSearchPlaceholder("Search...");
      setSearch("");
    };
  }, [setSearch, setSearchPlaceholder]);

  // Action actor name (role-ready: can be swapped later for HR/Manager)
  const actorName =
    currentUser?.personalInfo?.name ||
    currentUser?.name ||
    "Admin";

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  // Async loading flags
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  /*
  |--------------------------------------------------------------------------
  | Create Request
  |--------------------------------------------------------------------------
  */
  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      const result = await create(payload);
      if (!result?.success) {
        toast.error(result?.message || "Failed to create request.");
        return;
      }
      toast.success("Attendance request submitted successfully.");
      setCreateOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create attendance request.");
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Edit Request (pending only)
  |--------------------------------------------------------------------------
  */
  const handleEdit = async (payload) => {
    if (!editData?.requestId) return;
    setSubmitting(true);
    try {
      const result = await update(editData.requestId, payload);
      if (!result?.success) {
        toast.error(result?.message || "Failed to update request.");
        return;
      }
      toast.success("Attendance request updated successfully.");
      setEditData(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update attendance request.");
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Approve Request
  |--------------------------------------------------------------------------
  */
  const handleApprove = async (request) => {
    setApproving(true);
    try {
      const result = await approve(request, actorName);
      if (!result?.success) {
        toast.error(result?.message || "Failed to approve request.");
        return;
      }
      toast.success("Attendance request approved.");
      setDetailRequest(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve attendance request.");
    } finally {
      setApproving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Reject Request (remarks required)
  |--------------------------------------------------------------------------
  */
  const handleReject = async (remarks) => {
    if (!rejectRequest?.requestId) return;
    setRejecting(true);
    try {
      const result = await reject(
        rejectRequest.requestId,
        actorName,
        remarks
      );
      if (!result?.success) {
        toast.error(result?.message || "Failed to reject request.");
        return;
      }
      toast.success("Attendance request rejected.");
      setRejectRequest(null);
      setDetailRequest(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject attendance request.");
    } finally {
      setRejecting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Delete Request (pending only)
  |--------------------------------------------------------------------------
  */
  const handleDelete = async () => {
    if (!deleteRequest?.requestId) return;
    setDeleting(true);
    try {
      await remove(deleteRequest.requestId);
      toast.success("Attendance request deleted.");
      setDeleteRequest(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete attendance request.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-2">
      <AttendancePageHeader
        title="Attendance Requests"
        subtitle="Review and action attendance correction requests"
        icon={<FiFileText />}
      />

      <div className="mt-6 space-y-6">
        <AttendanceRequestList
          requests={requests}
          loading={loading}
          pendingCount={pendingCount}
          headerSearch={search}
          onCreate={() => setCreateOpen(true)}
          onView={setDetailRequest}
          onEdit={(request) => {
            setEditData(request);
            setCreateOpen(true);
          }}
          onDelete={setDeleteRequest}
          onApprove={handleApprove}
          onReject={(request) => {
            setRejectRequest(request);
            setDetailRequest(null);
          }}
        />
      </div>

      {/* Create / Edit Modal */}
      <AttendanceRequestModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditData(null);
        }}
        onSubmit={editData ? handleEdit : handleCreate}
        submitting={submitting}
        initialData={editData}
        currentUser={currentUser}
        title={editData ? "Edit Attendance Request" : "New Attendance Request"}
        subtitle={
          editData
            ? "Update the pending attendance correction request"
            : "Raise an attendance correction request"
        }
      />

      {/* Detail Modal */}
      <AttendanceRequestDetailModal
        open={Boolean(detailRequest)}
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        onApprove={handleApprove}
        onReject={(request) => {
          setRejectRequest(request);
          setDetailRequest(null);
        }}
        approving={approving}
        rejecting={rejecting}
      />

      {/* Reject Modal */}
      <RejectRequestModal
        open={Boolean(rejectRequest)}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRequest?.employeeName}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleteRequest)}
        onClose={() => setDeleteRequest(null)}
        onConfirm={handleDelete}
        loading={deleting}
        request={deleteRequest}
      />
    </div>
  );
}

export default AttendanceRequests;

