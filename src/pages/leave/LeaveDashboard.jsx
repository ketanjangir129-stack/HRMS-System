import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import ApplyLeaveModal from "../../components/leave/ApplyLeaveModal";
import LeaveBalanceCards from "../../components/leave/LeaveBalanceCards";
import LeaveCalendar from "../../components/leave/LeaveCalendar/LeaveCalendar";
import LeaveHeader from "../../components/leave/LeaveHeader";
import LeaveHistoryTable from "../../components/leave/LeaveHistoryTable";
import LeaveRequestDetailModal from "../../components/leave/LeaveRequestDetailModal";
import RecentLeaveRequests from "../../components/leave/RecentLeaveRequests";
import useAuth from "../../hooks/useAuth";
import useHolidayDates from "../../hooks/useHolidayDates";
import useLeaveBalance from "../../hooks/useLeaveBalance";
import useLeaveRequests from "../../hooks/useLeaveRequests";
import {
  getCurrentEmployeeId,
  isApprover,
} from "../../utils/attendance/attendanceRequestUtils";
import {
  filterLeaveRequestsByYear,
  formatLeaveRange,
  getPendingLeaveDays,
  isPendingLeave,
} from "../../utils/leave/leaveUtils";

/*
|--------------------------------------------------------------------------
| Leave Dashboard
|--------------------------------------------------------------------------
| The signed in employee's leave year: the balance, the calendar, the latest
| applications and the full history, with the apply flow on top.
|
| The year selector drives every panel, because leave is allocated, accrued
| and used per year.
|
| The balance is derived rather than stored, so the days locked up by still
| pending requests are computed here and handed to the balance hook. Without
| that an employee could apply twice for the same days before either request
| was reviewed.
|
| The holiday calendar is loaded here as well and handed to the apply modal,
| which prices a range against it: a day the company has declared closed is
| not charged to the balance.
|--------------------------------------------------------------------------
*/

function LeaveDashboard() {

    const { company, currentUser } = useAuth();

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const companyCode = company?.companyCode;

    const employeeId = getCurrentEmployeeId(currentUser);

    const [year, setYear] = useState(() => new Date().getFullYear());
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailRequest, setDetailRequest] = useState(null);
    const [deleteRequest, setDeleteRequest] = useState(null);

    /*
    | The employee id is passed, so the hook returns this employee's requests
    | only. The approval queue calls the same hook without it.
    */
    const {
        requests,
        loading: requestsLoading,
        error: requestsError,
        reload: reloadRequests,
        createRequest,
        deleteRequest: deleteLeave,
    } = useLeaveRequests(companyCode, employeeId);

    useEffect(() => {

        setSearchPlaceholder("Search leave requests...");

        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };

    }, [setSearch, setSearchPlaceholder]);

    const yearRequests = useMemo(
        () => filterLeaveRequestsByYear(requests, year),
        [requests, year]
    );

    const pendingDays = useMemo(
        () => getPendingLeaveDays(yearRequests),
        [yearRequests]
    );

    const {
        balance,
        loading: balanceLoading,
        error: balanceError,
        reload: reloadBalance,
    } = useLeaveBalance(
        companyCode,
        employeeId,
        year,
        pendingDays
    );

    /*
    | The selected year and the one after it: a range applied for in late
    | December runs into January, and both calendars have to be known before
    | the days can be priced.
    */
    const {
        holidayDates,
        reload: reloadHolidays,
    } = useHolidayDates(
        companyCode,
        useMemo(() => [year, year + 1], [year])
    );

    const pendingCount = useMemo(
        () => requests.filter(isPendingLeave).length,
        [requests]
    );

    const loading = balanceLoading || requestsLoading;

    const handleRefresh = () => {
        reloadBalance();
        reloadRequests();
        reloadHolidays();
    };

    /*
    |--------------------------------------------------------------------------
    | Apply
    |--------------------------------------------------------------------------
    | The modal collects the leave; the employee it belongs to is added here,
    | because that is what the request is filtered and approved by.
    */

    const handleApply = async (payload) => {

        if (!employeeId) {
            toast.error("Your employee profile is missing an employee ID.");
            return;
        }

        setSubmitting(true);

        try {

            const result = await createRequest({
                ...payload,
                employeeId,
            });

            if (!result?.success) {
                toast.error(result?.message || "Failed to submit leave request.");
                return;
            }

            toast.success("Leave request submitted for approval.");
            setShowApplyModal(false);

        } catch (applyError) {

            console.error(applyError);
            toast.error("Failed to submit leave request.");

        } finally {

            setSubmitting(false);

        }

    };

    /*
    |--------------------------------------------------------------------------
    | Withdraw
    |--------------------------------------------------------------------------
    */

    const handleDelete = async () => {

        if (!deleteRequest?.requestId) return;

        try {

            const result = await deleteLeave(deleteRequest);

            if (!result?.success) {
                toast.error(result?.message || "Failed to withdraw leave request.");
                return;
            }

            toast.success("Leave request withdrawn.");
            setDeleteRequest(null);

        } catch (deleteError) {

            console.error(deleteError);
            toast.error("Failed to withdraw leave request.");

        }

    };

    return (

        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            <LeaveHeader
                year={year}
                setYear={setYear}
                loading={loading}
                onRefresh={handleRefresh}
                onApplyLeave={() =>
                    setShowApplyModal(true)
                }
                canReview={isApprover(currentUser)}
                pendingCount={pendingCount}
            />

            <LeaveBalanceCards
                balance={balance}
                loading={balanceLoading}
            />

            {balanceError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    {balanceError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

                <div className="xl:col-span-5">
                    <LeaveCalendar
                        requests={yearRequests}
                        loading={requestsLoading}
                        year={year}
                    />
                </div>

                <div className="xl:col-span-7">
                    <RecentLeaveRequests
                        requests={yearRequests}
                        loading={requestsLoading}
                        error={requestsError}
                        onRetry={reloadRequests}
                        employeeId={employeeId}
                        onView={setDetailRequest}
                        onDelete={setDeleteRequest}
                    />
                </div>

            </div>

            <LeaveHistoryTable
                requests={yearRequests}
                loading={requestsLoading}
                error={requestsError}
                onRetry={reloadRequests}
                subtitle={`Every leave request you submitted in ${year}`}
                headerSearch={search}
                emptyMessage="Leave requests you submit will appear here."
            />

            <ApplyLeaveModal
                open={showApplyModal}
                onClose={() =>
                    setShowApplyModal(false)
                }
                balance={balance}
                onSubmit={handleApply}
                submitting={submitting}
                holidayDates={holidayDates}
            />

            <LeaveRequestDetailModal
                open={Boolean(detailRequest)}
                request={detailRequest}
                onClose={() => setDetailRequest(null)}
            />

            <ConfirmDeleteModal
                open={Boolean(deleteRequest)}
                title="Withdraw Leave Request"
                message="Are you sure you want to withdraw this leave request?"
                itemName={
                    deleteRequest
                        ? formatLeaveRange(deleteRequest)
                        : ""
                }
                confirmText="Withdraw Request"
                onConfirm={handleDelete}
                onClose={() => setDeleteRequest(null)}
            />

        </div>
    );
}

export default LeaveDashboard;
