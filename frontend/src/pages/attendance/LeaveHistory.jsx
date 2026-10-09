import { useMemo, useState } from "react";
import { FiEdit2, FiEye, FiTrash2, FiUserX } from "react-icons/fi";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import DepartmentScopeNotice from "../../components/common/DepartmentScopeNotice";
import ApplyLeaveModal from "../../components/leave/ApplyLeaveModal";
import LeaveBalanceCards from "../../components/leave/LeaveBalanceCards";
import LeaveCalendar from "../../components/leave/LeaveCalendar/LeaveCalendar";
import LeaveHistoryTable from "../../components/leave/LeaveHistoryTable";
import LeavePageHeader from "../../components/leave/LeavePageHeader";
import LeaveRequestDetailModal from "../../components/leave/LeaveRequestDetailModal";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useLeaveBalance from "../../hooks/useLeaveBalance";
import useLeaveRequests from "../../hooks/useLeaveRequests";
import useManagerScope from "../../hooks/useManagerScope";
import { downloadCsv } from "../../utils/attendance/attendanceTable";
import { attachEmployeeDetails } from "../../utils/attendance/attendanceUtils";
import {
  getCurrentEmployeeId,
  isApprover,
} from "../../utils/attendance/attendanceRequestUtils";
import { LEAVE_STATUS } from "../../utils/leave/leaveConstants";
import {
  filterLeaveRequestsByYear,
  formatLeaveRange,
  getLeaveWorkingDateKeys,
  getPendingLeaveDays,
  isApprovedLeave,
  isPendingLeave,
} from "../../utils/leave/leaveUtils";

const MONTH_LABELS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

/*
|--------------------------------------------------------------------------
| Leave History
|--------------------------------------------------------------------------
| The merged home of a person's leave, under Attendance: their own balance,
| their own calendar and the year's requests.
|
| Reviewers additionally get a per-employee roll-up: who took how many days,
| who is waiting, who was declined. HR and the owner see the whole company;
| a manager sees only the departments they run, through the same scope rule
| the approvals page uses.
|--------------------------------------------------------------------------
*/

function LeaveHistory() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const employeeId = getCurrentEmployeeId(currentUser);

  const reviewer = isApprover(currentUser);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [detailRequest, setDetailRequest] = useState(null);
  const [editRequest, setEditRequest] = useState(null);
  const [withdrawRequest, setWithdrawRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  const {
    requests: allRequests,
    loading,
    error,
    reload,
    deleteRequest,
    updateRequest,
  } = useLeaveRequests(companyCode);

  const { directory } = useEmployeeDirectory(companyCode);

  const { filterRows } = useManagerScope();

  const ownRequests = useMemo(
    () =>
      employeeId
        ? allRequests.filter(
            (request) => request.employeeId === employeeId
          )
        : [],
    [allRequests, employeeId]
  );

  /*
  | The table follows the same scope rule as the approvals desk: reviewers
  | read the list narrowed to their departments, everyone else their own.
  */
  const scopedRequests = useMemo(
    () =>
      reviewer
        ? filterRows(attachEmployeeDetails(allRequests, directory))
        : ownRequests,
    [reviewer, filterRows, allRequests, directory, ownRequests]
  );

  const yearRequests = useMemo(
    () => filterLeaveRequestsByYear(ownRequests, year),
    [ownRequests, year]
  );

  const pendingDays = useMemo(
    () => getPendingLeaveDays(yearRequests),
    [yearRequests]
  );

  /*
  | While editing, the request being edited is not counted as already spent,
  | or the modal's preview would overstate the cost of keeping its own days.
  */
  const modalPendingDays =
    editRequest && editRequest.status === LEAVE_STATUS.PENDING
      ? Math.max(0, pendingDays - (Number(editRequest.days) || 0))
      : pendingDays;

  const {
    balance,
    settings,
    loading: balanceLoading,
    error: balanceError,
  } = useLeaveBalance(companyCode, employeeId, year, modalPendingDays);

  const { holidayDates } = useHolidayDates(
    companyCode,
    useMemo(() => [year, year + 1], [year])
  );

  const ownYearRequests = useMemo(
    () => filterLeaveRequestsByYear(ownRequests, year),
    [ownRequests, year]
  );

  /*
  | Month-wise roll-up of the user's own approved leave: what accrued and
  | what was charged, month by month. Charged days are the working days the
  | request actually cost, the same keys the attendance sheet was written
  | from, so the table and the balance cards cannot disagree.
  */
  const monthRows = useMemo(() => {

    const usedByMonth = {};

    ownRequests.forEach((request) => {

      if (!isApprovedLeave(request)) return;

      getLeaveWorkingDateKeys(request, holidayDates).forEach((dateKey) => {

        if (dateKey.slice(0, 4) !== String(year)) return;

        const monthIndex = Number(dateKey.slice(5, 7)) - 1;

        usedByMonth[monthIndex] = (usedByMonth[monthIndex] || 0) + 1;

      });

    });

    const monthlyAccrual = settings?.monthlyAccrual ?? 1;

    const nowMonth = new Date().getMonth();

    const nowYear = new Date().getFullYear();

    return MONTH_LABELS.map((label, monthIndex) => {

      const entitled =
        year < nowYear
          ? monthlyAccrual
          : year > nowYear
            ? 0
            : monthIndex <= nowMonth
              ? monthlyAccrual
              : 0;

      const used = usedByMonth[monthIndex] || 0;

      return { label, entitled, used, net: entitled - used };

    });

  }, [ownRequests, year, holidayDates, settings]);

  /*
  | Who took how many days, for the reviewer's scope. Only approved days
  | count as taken; pending and rejected are shown so a manager can see
  | the queue pressure without it inflating the total.
  */
  const perEmployee = useMemo(() => {

    if (!reviewer) return [];

    const byId = {};

    scopedRequests.forEach((request) => {

      const id = request.employeeId || "unknown";

      if (!byId[id]) {
        byId[id] = {
          employeeId: id,
          name: request.employeeName || id,
          department: request.department || "",
          approvedDays: 0,
          pending: 0,
          rejected: 0,
        };
      }

      if (isApprovedLeave(request)) {
        byId[id].approvedDays += Number(request.days) || 0;
      } else if (isPendingLeave(request)) {
        byId[id].pending += 1;
      } else if (request.status === LEAVE_STATUS.REJECTED) {
        byId[id].rejected += 1;
      }

    });

    return Object.values(byId).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );

  }, [reviewer, scopedRequests]);

  const handleExportPerEmployee = () => {
    downloadCsv(
      "leave-by-employee.csv",
      ["Employee", "Department", "Approved Days", "Pending", "Rejected"],
      perEmployee.map((row) => [
        row.name,
        row.department,
        row.approvedDays,
        row.pending,
        row.rejected,
      ])
    );
  };

  const handleEdit = async (payload) => {

    if (!editRequest) return;

    setSaving(true);

    try {

      const result = await updateRequest(editRequest, payload);

      if (!result?.success) {
        toast.error(result?.message || "Failed to update leave request.");
        return;
      }

      toast.success("Leave request updated.");
      setEditRequest(null);

    } catch (editError) {

      console.error(editError);
      toast.error("Failed to update leave request.");

    } finally {

      setSaving(false);

    }

  };

  const handleWithdraw = async () => {

    if (!withdrawRequest) return;

    try {

      const result = await deleteRequest(withdrawRequest);

      if (!result?.success) {
        toast.error(result?.message || "Failed to withdraw leave request.");
        return;
      }

      toast.success("Leave request withdrawn.");
      setWithdrawRequest(null);

    } catch (deleteError) {

      console.error(deleteError);
      toast.error("Failed to withdraw leave request.");

    }

  };

  /*
  | An account without an employee record has no leave of its own to show, so
  | unless it is a reviewer (HR, manager, owner) it gets an empty state. A
  | reviewer with no employee id still sees the company and summary views -
  | the owner sees everything, the balance cards and the personal calendar
  | are simply the ones that do not apply to them.
  */

  if (!employeeId && !reviewer) {

    return (

      <div className="p-0 sm:p-2">

        <LeavePageHeader
          title="Leave History"
          subtitle="Your balance, calendar and requests"
          icon={<FiUserX />}
        />

        <div className="ui-card mt-6 flex flex-col items-center justify-center px-4 py-14 text-center sm:mt-8 sm:px-6 sm:py-20">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted text-ink-subtle">
            <FiUserX size={28} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
            No employee record linked
          </h3>

          <p className="mt-2 max-w-sm text-sm text-ink-subtle">
            This account is not linked to an employee, so it has no leave of
            its own. Company leave is on the approvals page.
          </p>

        </div>

      </div>

    );

  }

  return (

    <div className="p-0 sm:p-2">

      <LeavePageHeader
        title="Leave History"
        subtitle={`Your leave for ${year}`}
        action={
          <>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              aria-label="Leave year"
              className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring"
            >
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="ui-btn ui-btn-secondary font-semibold"
            >
              Refresh
            </button>
          </>
        }
      />

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        <DepartmentScopeNotice subject="leave requests" />

        {employeeId && (

          <LeaveBalanceCards
            balance={balance}
            loading={balanceLoading}
          />

        )}

        {balanceError && employeeId && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 sm:p-4 sm:text-sm">
            {balanceError}
          </div>
        )}

        {/* Calendar + month-wise breakdown, for accounts with an employee record */}

        {employeeId && (

        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12">

          <div className="xl:col-span-5">
            <LeaveCalendar
              requests={ownYearRequests}
              loading={loading}
              year={year}
            />
          </div>

          <div className="xl:col-span-7">

            <div className="ui-card overflow-hidden">

              <div className="border-b border-line px-4 py-3 sm:px-5 sm:py-4">
                <h3 className="text-sm font-semibold text-ink sm:text-base">
                  Month-wise Balance
                </h3>

                <p className="text-xs text-ink-subtle sm:text-sm">
                  Accrued versus charged, month by month, {year}
                </p>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-subtle">
                      <th className="px-4 py-2.5 sm:px-5">Month</th>
                      <th className="px-4 py-2.5 text-right">Entitled</th>
                      <th className="px-4 py-2.5 text-right">Used</th>
                      <th className="px-4 py-2.5 text-right sm:px-5">Net</th>
                    </tr>
                  </thead>

                  <tbody>

                    {monthRows.map((row) => (

                      <tr key={row.label} className="border-t border-line">

                        <td className="px-4 py-2.5 font-medium text-ink-muted sm:px-5">
                          {row.label}
                        </td>

                        <td className="px-4 py-2.5 text-right text-ink-muted">
                          {row.entitled}
                        </td>

                        <td className="px-4 py-2.5 text-right text-ink-muted">
                          {row.used}
                        </td>

                        <td className="px-4 py-2.5 text-right font-semibold text-ink sm:px-5">
                          {row.net}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        </div>

        )}

        {/* Who took what: reviewers only */}

        {reviewer && (

          <div className="ui-card overflow-hidden">

            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">

              <div>
                <h3 className="text-sm font-semibold text-ink sm:text-base">
                  Leave By Employee
                </h3>

                <p className="text-xs text-ink-subtle sm:text-sm">
                  Approved days, pending and rejected requests across your scope
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportPerEmployee}
                disabled={perEmployee.length === 0}
                className="ui-btn ui-btn-secondary font-semibold"
              >
                Export CSV
              </button>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-subtle">
                    <th className="px-4 py-2.5 sm:px-5">Employee</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5 text-right">Approved Days</th>
                    <th className="px-4 py-2.5 text-right">Pending</th>
                    <th className="px-4 py-2.5 text-right sm:px-5">Rejected</th>
                  </tr>
                </thead>

                <tbody>

                  {perEmployee.map((row) => (

                    <tr key={row.employeeId} className="border-t border-line">

                      <td className="px-4 py-2.5 font-medium text-ink-muted sm:px-5">
                        {row.name}
                      </td>

                      <td className="px-4 py-2.5 text-ink-subtle">
                        {row.department}
                      </td>

                      <td className="px-4 py-2.5 text-right font-semibold text-ink">
                        {row.approvedDays}
                      </td>

                      <td className="px-4 py-2.5 text-right text-ink-muted">
                        {row.pending}
                      </td>

                      <td className="px-4 py-2.5 text-right text-ink-muted sm:px-5">
                        {row.rejected}
                      </td>

                    </tr>

                  ))}

                  {perEmployee.length === 0 && (

                    <tr className="border-t border-line">
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-ink-subtle"
                      >
                        No leave requests in your scope for {year}.
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

        <LeaveHistoryTable
          requests={filterLeaveRequestsByYear(scopedRequests, year)}
          loading={loading}
          error={error}
          onRetry={reload}
          showEmployee={reviewer}
          subtitle={`Every leave request in ${year}`}
          emptyMessage="Leave requests you submit will appear here."
          renderActions={(request) => (

            <div className="flex items-center justify-end gap-2">

              <button
                type="button"
                onClick={() => setDetailRequest(request)}
                aria-label="View request"
                title="View request"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
              >
                <FiEye size={15} />
              </button>

              {/*
              | Editing and withdrawing belong to the person the request is
              | for, and only while nobody has decided it yet. A decided
              | request stays read-only so the days on the attendance sheet
              | can never drift from what was approved.
              */}
              {request.employeeId === employeeId &&
                isPendingLeave(request) && (

                <>

                  <button
                    type="button"
                    onClick={() => setEditRequest(request)}
                    aria-label="Edit request"
                    title="Edit request"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <FiEdit2 size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawRequest(request)}
                    aria-label="Withdraw request"
                    title="Withdraw request"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <FiTrash2 size={15} />
                  </button>

                </>

              )}

            </div>

          )}
        />

      </div>

      <LeaveRequestDetailModal
        open={Boolean(detailRequest)}
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
      />

      <ApplyLeaveModal
        open={Boolean(editRequest)}
        onClose={() => setEditRequest(null)}
        initialRequest={editRequest}
        balance={balance}
        onSubmit={handleEdit}
        submitting={saving}
        holidayDates={holidayDates}
      />

      <ConfirmDeleteModal
        open={Boolean(withdrawRequest)}
        title="Withdraw Leave Request"
        message="Are you sure you want to withdraw this leave request?"
        itemName={
          withdrawRequest ? formatLeaveRange(withdrawRequest) : ""
        }
        confirmText="Withdraw Request"
        onConfirm={handleWithdraw}
        onClose={() => setWithdrawRequest(null)}
      />

    </div>
  );

}

export default LeaveHistory;
