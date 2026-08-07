import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiCheckSquare, FiEye, FiLock, FiTrash2, FiX } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import LeaveApprovalSummary from "../../components/leave/LeaveApprovalSummary";
import LeaveHistoryTable from "../../components/leave/LeaveHistoryTable";
import LeavePageHeader from "../../components/leave/LeavePageHeader";
import LeaveRequestDetailModal from "../../components/leave/LeaveRequestDetailModal";
import RejectLeaveModal from "../../components/leave/RejectLeaveModal";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useLeaveRequests from "../../hooks/useLeaveRequests";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";
import { attachEmployeeDetails } from "../../utils/attendance/attendanceUtils";
import {
  filterLeaveRequestsByYear,
  formatLeaveRange,
  getLeaveRequestSummary,
  isPendingLeave,
} from "../../utils/leave/leaveUtils";

/*
|--------------------------------------------------------------------------
| HR Leave Approvals
|--------------------------------------------------------------------------
| The review queue: every leave request in the company for the selected year,
| with approve, reject and delete.
|
| Approving books the days against the employee's usage and writes them onto
| the attendance sheet, so the balance on their dashboard moves and the days
| stop counting as absences the moment the decision is made. Both happen in
| the service, and this page only reports the outcome.
|
| Requests store the employee id only, so they are joined with the employee
| directory here before they are listed or searched.
|--------------------------------------------------------------------------
*/

/*
| The review queue is a decision list, not a record: it shows who asked, for
| which days, what kind of leave, when they asked and where it stands. The
| duration and the reason are read in the detail modal before deciding, and
| both are still in the CSV export.
*/

const APPROVAL_COLUMNS = [
  "employeeName",
  "fromDate",
  "requestType",
  "requestedAt",
  "status",
  "actions",
];

function LeaveApprovals() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const canReview = isApprover(currentUser);

  const [year, setYear] = useState(() => new Date().getFullYear());

  const [detailRequest, setDetailRequest] = useState(null);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  /*
  | No employee id is passed, so the hook returns every request in the
  | company rather than only the reviewer's own.
  */
  const {
    requests,
    loading,
    error,
    reload,
    approveRequest,
    rejectRequest: rejectLeave,
    deleteRequest: deleteLeave,
  } = useLeaveRequests(companyCode);

  const {
    directory,
    loading: directoryLoading,
  } = useEmployeeDirectory(companyCode);

  useEffect(() => {

    setSearchPlaceholder("Search leave requests...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };

  }, [setSearch, setSearchPlaceholder]);

  const yearRequests = useMemo(
    () =>
      filterLeaveRequestsByYear(
        attachEmployeeDetails(requests, directory),
        year
      ),
    [requests, directory, year]
  );

  const summary = useMemo(
    () => getLeaveRequestSummary(yearRequests),
    [yearRequests]
  );

  /*
  | The detail modal reads from the live list, so a decision made while it is
  | open is reflected instead of showing the request as it was opened.
  */
  const activeDetail = useMemo(
    () =>
      detailRequest
        ? yearRequests.find(
            (request) => request.requestId === detailRequest.requestId
          ) || null
        : null,
    [detailRequest, yearRequests]
  );

  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  const currentYear = new Date().getFullYear();

  const years = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  /*
  |--------------------------------------------------------------------------
  | Approve / Reject / Delete
  |--------------------------------------------------------------------------
  */

  const handleApprove = async (request) => {

    setApproving(true);

    try {

      const result = await approveRequest(request, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve leave request.");
        return;
      }

      toast.success("Leave approved, balance and attendance updated.");
      setDetailRequest(null);

    } catch (approveError) {

      console.error(approveError);
      toast.error("Failed to approve leave request.");

    } finally {

      setApproving(false);

    }

  };

  const handleReject = async (remarks) => {

    if (!rejectRequest) return;

    setRejecting(true);

    try {

      const result = await rejectLeave(
        rejectRequest,
        actorName,
        remarks
      );

      if (!result?.success) {
        toast.error(result?.message || "Failed to reject leave request.");
        return;
      }

      toast.success("Leave request rejected.");
      setRejectRequest(null);
      setDetailRequest(null);

    } catch (rejectError) {

      console.error(rejectError);
      toast.error("Failed to reject leave request.");

    } finally {

      setRejecting(false);

    }

  };

  const handleDelete = async () => {

    if (!deleteRequest) return;

    try {

      const result = await deleteLeave(deleteRequest);

      if (!result?.success) {
        toast.error(result?.message || "Failed to delete leave request.");
        return;
      }

      toast.success("Leave request deleted.");
      setDeleteRequest(null);

    } catch (deleteError) {

      console.error(deleteError);
      toast.error("Failed to delete leave request.");

    }

  };

  /*
  |--------------------------------------------------------------------------
  | Access
  |--------------------------------------------------------------------------
  | The queue holds every employee's leave, so it is only opened for the
  | roles that review it.
  */

  if (!canReview) {

    return (

      <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

        <LeavePageHeader
          title="Leave Approvals"
          subtitle="Review and decide leave requests"
          icon={<FiCheckSquare />}
        />

        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiLock size={28} />
          </div>

          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            Approvals are restricted
          </h3>

          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Only HR and the company owner can review leave requests. Your own
            requests are on the leave dashboard.
          </p>

        </div>

      </div>

    );

  }

  return (

    <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

      <LeavePageHeader
        title="Leave Approvals"
        subtitle="Review and decide leave requests"
        icon={<FiCheckSquare />}
        action={
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            aria-label="Leave year"
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        }
      />

      <LeaveApprovalSummary
        summary={summary}
        loading={loading || directoryLoading}
      />

      <LeaveHistoryTable
        requests={yearRequests}
        loading={loading || directoryLoading}
        error={error}
        onRetry={reload}
        title="Leave Requests"
        subtitle={
          summary.pending > 0
            ? `${summary.pending} request${summary.pending !== 1 ? "s" : ""} awaiting your review`
            : "No requests awaiting review"
        }
        showEmployee
        visibleColumns={APPROVAL_COLUMNS}
        headerSearch={search}
        emptyTitle="No Leave Requests"
        emptyMessage="Leave requests raised by employees will appear here."
        renderActions={(request) => (

          <div className="flex items-center justify-end gap-2">

            <button
              type="button"
              onClick={() => setDetailRequest(request)}
              aria-label="View request"
              title="View request"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <FiEye size={15} />
            </button>

            {isPendingLeave(request) && (

              <>

                <button
                  type="button"
                  onClick={() => handleApprove(request)}
                  disabled={approving}
                  aria-label="Approve request"
                  title="Approve request"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiCheck size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setRejectRequest(request)}
                  aria-label="Reject request"
                  title="Reject request"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <FiX size={15} />
                </button>

              </>

            )}

            <button
              type="button"
              onClick={() => setDeleteRequest(request)}
              aria-label="Delete request"
              title="Delete request"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <FiTrash2 size={15} />
            </button>

          </div>

        )}
      />

      <LeaveRequestDetailModal
        open={Boolean(activeDetail)}
        request={activeDetail}
        canReview={canReview}
        onClose={() => setDetailRequest(null)}
        onApprove={handleApprove}
        onReject={(request) => {
          setRejectRequest(request);
          setDetailRequest(null);
        }}
        approving={approving}
      />

      <RejectLeaveModal
        open={Boolean(rejectRequest)}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRequest?.employeeName}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteRequest)}
        title="Delete Leave Request"
        message="Are you sure you want to delete this leave request?"
        itemName={
          deleteRequest
            ? `${deleteRequest.employeeName || deleteRequest.employeeId} · ${formatLeaveRange(deleteRequest)}`
            : ""
        }
        note="An approved request will have its days returned to the employee's balance and cleared from their attendance. This action cannot be undone."
        confirmText="Delete Request"
        onConfirm={handleDelete}
        onClose={() => setDeleteRequest(null)}
      />

    </div>

  );

}

export default LeaveApprovals;
