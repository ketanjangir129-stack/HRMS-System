import { useEffect, useMemo, useState } from "react";
import { FiFileText } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRequestDetailModal from "../../components/attendance/requests/AttendanceRequestDetailModal";
import AttendanceRequestList from "../../components/attendance/requests/AttendanceRequestList";
import AttendanceRequestModal from "../../components/attendance/requests/AttendanceRequestModal";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import DepartmentScopeNotice from "../../components/common/DepartmentScopeNotice";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useManagerScope from "../../hooks/useManagerScope";
import {
  canReviewRequest,
  filterOwnRequests,
  getRequestTypeLabel,
  isApprover,
} from "../../utils/attendance/attendanceRequestUtils";
import { attachEmployeeDetails } from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Attendance Requests
|--------------------------------------------------------------------------
| Employees raise, edit and delete their own pending requests. HR and owners
| review every request and approve or reject it.
|
| A manager reviews the same way, narrowed to the departments they run. The
| narrowing is applied once, to the joined list, and the scope is then handed
| down to the list and the modal so each row decides for itself whether the
| approve and reject buttons belong on it. That is why the manager's own
| request is still on the list: it is theirs to read and HR's to decide, and
| filtering it out would hide a request they raised themselves.
|
| Requests store the employee id only, so they are joined with the employee
| directory here before they are listed or searched.
|--------------------------------------------------------------------------
*/

function AttendanceRequests() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const canReview = isApprover(currentUser);

  const {
    requests,
    loading,
    error,
    create,
    update,
    approve,
    reject,
    remove,
  } = useAttendanceRequests(companyCode);

  const {
    directory,
    activeEmployees,
    loading: directoryLoading,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  const {
    scope: reviewScope,
    isScoped,
    filterRows,
    filterEmployees,
    loading: scopeLoading,
  } = useManagerScope();

  // Employees only ever see their own requests.
  const [scope, setScope] = useState(() => (canReview ? "all" : "mine"));

  const [createOpen, setCreateOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    setSearchPlaceholder("Search attendance requests...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const detailedRequests = useMemo(
    () => filterRows(attachEmployeeDetails(requests, directory)),
    [filterRows, requests, directory]
  );

  const visibleRequests = useMemo(
    () =>
      canReview && scope === "all"
        ? detailedRequests
        : filterOwnRequests(detailedRequests, currentUser),
    [canReview, scope, detailedRequests, currentUser]
  );

  /*
  | The detail modal is fed from the live list, so an approval or a rejection
  | made elsewhere is reflected while it is open.
  */
  const activeDetail = useMemo(
    () =>
      detailRequest
        ? detailedRequests.find(
          (request) => request.requestId === detailRequest.requestId
        ) || null
        : null,
    [detailRequest, detailedRequests]
  );

  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  /*
  |--------------------------------------------------------------------------
  | Create / Edit
  |--------------------------------------------------------------------------
  */

  const closeForm = () => {
    setCreateOpen(false);
    setEditRequest(null);
  };

  const handleSubmit = async (payload) => {

    setSubmitting(true);

    try {

      const result = editRequest
        ? await update(editRequest, payload)
        : await create(payload);

      if (!result?.success) {
        toast.error(result?.message || "Failed to save request.");
        return;
      }

      toast.success(
        editRequest
          ? "Attendance request updated successfully."
          : "Attendance request submitted successfully."
      );

      closeForm();

    } catch (submitError) {

      console.error(submitError);
      toast.error("Failed to save attendance request.");

    } finally {

      setSubmitting(false);

    }

  };

  /*
  |--------------------------------------------------------------------------
  | Approve / Reject
  |--------------------------------------------------------------------------
  */

  /*
  | The same question the row's buttons were drawn from, asked again at the
  | moment the write happens. The list already withholds them, so this only
  | catches a decision made through a stale render.
  */
  const refuseOutOfScope = (request) => {

    if (canReviewRequest(request, currentUser, reviewScope)) return false;

    toast.error("This employee is not in a department you manage.");

    return true;

  };

  const handleApprove = async (request) => {

    if (refuseOutOfScope(request)) return;

    setApproving(true);

    try {

      const result = await approve(request, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve request.");
        return;
      }

      toast.success("Request approved and attendance updated.");
      setDetailRequest(null);

    } catch (approveError) {

      console.error(approveError);
      toast.error("Failed to approve attendance request.");

    } finally {

      setApproving(false);

    }

  };

  const handleReject = async (remarks) => {

    if (!rejectRequest) return;

    if (refuseOutOfScope(rejectRequest)) {
      setRejectRequest(null);
      return;
    }

    setRejecting(true);

    try {

      const result = await reject(
        rejectRequest,
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

    } catch (rejectError) {

      console.error(rejectError);
      toast.error("Failed to reject attendance request.");

    } finally {

      setRejecting(false);

    }

  };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const handleDelete = async () => {

    if (!deleteRequest) return;

    try {

      const result = await remove(deleteRequest);

      if (!result?.success) {
        toast.error(result?.message || "Failed to delete request.");
        return;
      }

      toast.success("Attendance request deleted.");
      setDeleteRequest(null);

    } catch (deleteError) {

      console.error(deleteError);
      toast.error("Failed to delete attendance request.");

    }

  };

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Attendance Requests"
        subtitle="Raise and review attendance correction requests"
        icon={<FiFileText />}
      />

      <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">

        <DepartmentScopeNotice subject="requests" />

        <AttendanceRequestList
          requests={visibleRequests}
          loading={loading || directoryLoading || scopeLoading}
          error={error}
          onRetry={reloadDirectory}
          currentUser={currentUser}
          headerSearch={search}
          canReview={canReview}
          reviewScope={reviewScope}
          allScopeLabel={isScoped ? "Department Requests" : "All Requests"}
          scope={scope}
          onScopeChange={setScope}
          onCreate={() => {
            setEditRequest(null);
            setCreateOpen(true);
          }}
          onView={setDetailRequest}
          onEdit={(request) => {
            setEditRequest(request);
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

      <AttendanceRequestModal
        open={createOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        submitting={submitting}
        initialData={editRequest}
        currentUser={currentUser}
        /*
        | A reviewer may raise a correction on somebody's behalf, so the
        | picker is the roster they review and not the whole company.
        */
        employees={filterEmployees(activeEmployees)}
        canSelectEmployee={canReview}
        title={
          editRequest ? "Edit Attendance Request" : "New Attendance Request"
        }
        subtitle={
          editRequest
            ? "Update your pending attendance correction request"
            : "Raise an attendance correction request"
        }
      />

      <AttendanceRequestDetailModal
        open={Boolean(activeDetail)}
        request={activeDetail}
        currentUser={currentUser}
        reviewScope={reviewScope}
        onClose={() => setDetailRequest(null)}
        onApprove={handleApprove}
        onReject={(request) => {
          setRejectRequest(request);
          setDetailRequest(null);
        }}
        approving={approving}
        rejecting={rejecting}
      />

      <RejectRequestModal
        open={Boolean(rejectRequest)}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRequest?.employeeName}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteRequest)}
        title="Delete Request"
        message="Are you sure you want to delete this attendance request?"
        itemName={
          deleteRequest
            ? `${getRequestTypeLabel(deleteRequest.type)} · ${deleteRequest.requestId}`
            : ""
        }
        confirmText="Delete Request"
        onConfirm={handleDelete}
        onClose={() => setDeleteRequest(null)}
      />

    </div>
  );

}

export default AttendanceRequests;
