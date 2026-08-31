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
import useRoleAccess from "../../hooks/useRoleAccess";
import { getCurrentEmployeeId } from "../../utils/attendance/attendanceRequestUtils";
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

    const { canAccessSection } = useRoleAccess();

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const companyCode = company?.companyCode;

    const employeeId = getCurrentEmployeeId(currentUser);

    /*
    | Which panels this role holds. The approvals shortcut is now decided by
    | the same permission that guards `/leave/approvals`, rather than by the
    | role alone, so the owner can take the queue away from HR without
    | changing what HR is.
    */
    const showBalance = canAccessSection("leave.balance");
    const showCalendar = canAccessSection("leave.calendar");
    const showHistory = canAccessSection("leave.history");
    const canApply = canAccessSection("leave.apply");
    const canReview = canAccessSection("leave.approvals");

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

        /*
        | The button is already hidden without this permission. Checked again
        | here because the submit path is what actually writes, and it should
        | not depend on the button being the only way to reach it.
        */
        if (!canApply) {
            toast.error("You are not allowed to apply for leave.");
            return;
        }

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

        if (!deleteRequest) return;

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

        <div className="mx-auto max-w-[1600px] p-0 sm:p-2">

            <LeaveHeader
                year={year}
                setYear={setYear}
                loading={loading}
                onRefresh={handleRefresh}
                onApplyLeave={() =>
                    setShowApplyModal(true)
                }
                canReview={canReview}
                canApply={canApply}
                pendingCount={pendingCount}
            />

            {/*
            | The header sits directly on the canvas, so the panels below it
            | open with the same gap the Dashboard leaves under its greeting
            | rather than being pulled up against the heading.
            */}
            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

                {showBalance && (
                    <>

                        <LeaveBalanceCards
                            balance={balance}
                            loading={balanceLoading}
                        />

                        {balanceError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 sm:p-4 sm:text-sm">
                                {balanceError}
                            </div>
                        )}

                    </>
                )}

                {/*
                | The calendar and the recent list only sit side by side from
                | `xl`. Below that the calendar needs the full width to keep
                | seven readable columns, so the two stack rather than being
                | squeezed into halves of a tablet.
                */}
                {(showCalendar || showHistory) && (

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12">

                        {showCalendar && (
                            <div className={showHistory ? "xl:col-span-5" : "xl:col-span-12"}>
                                <LeaveCalendar
                                    requests={yearRequests}
                                    loading={requestsLoading}
                                    year={year}
                                />
                            </div>
                        )}

                        {showHistory && (
                            <div className={showCalendar ? "xl:col-span-7" : "xl:col-span-12"}>
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
                        )}

                    </div>

                )}

                {showHistory && (
                    <LeaveHistoryTable
                        requests={yearRequests}
                        loading={requestsLoading}
                        error={requestsError}
                        onRetry={reloadRequests}
                        subtitle={`Every leave request you submitted in ${year}`}
                        headerSearch={search}
                        emptyMessage="Leave requests you submit will appear here."
                    />
                )}

            </div>

            <ApplyLeaveModal
                open={showApplyModal && canApply}
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
