import { useEffect, useMemo, useState } from "react";
import { FiCheckSquare, FiLock, FiUser } from "react-icons/fi";
import { Link, useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import { MonthNavigator } from "../../components/attendance/common/AttendancePanel";
import ApprovalDetailModal from "../../components/attendance/approvals/ApprovalDetailModal";
import ApprovalStatCards from "../../components/attendance/approvals/ApprovalStatCards";
import ApprovalTable from "../../components/attendance/approvals/ApprovalTable";
import ChangeStatusModal from "../../components/attendance/approvals/ChangeStatusModal";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
import DepartmentScopeNotice from "../../components/common/DepartmentScopeNotice";
import useAttendanceApprovals from "../../hooks/useAttendanceApprovals";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useManagerScope from "../../hooks/useManagerScope";
import { APPROVAL_STATUS } from "../../utils/attendance/attendanceConstants";
import {
  filterByApproval,
  filterByDateRange,
  getApprovalSummary,
  getMonthRange,
  getRecordKey,
} from "../../utils/attendance/attendanceApproval";
import {
  getMonthLabel,
  shiftMonth,
} from "../../utils/attendance/attendanceDate";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";
import { searchRows } from "../../utils/attendance/attendanceTable";
import {
  attachEmployeeDetails,
  isPendingApproval,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Attendance Approval
|--------------------------------------------------------------------------
| The desk where recorded days are signed off.
|
| A punch is self reported: until somebody entitled to decide has looked at
| it, the day is Pending and is not counted as attendance anywhere in the
| module. That decision used to be made on the Daily Attendance page, in an
| extra column beside today's punches - which meant it could only ever be made
| for today, one row at a time, on a screen that exists to report a day rather
| than to review one. A day missed on Friday was a day nobody could reach on
| Monday.
|
| This page is the review itself and is built around it:
|
|   a period, not a day    a month is one node, so a month is read and then
|                          narrowed to any range inside it
|   a queue, not a table   Pending, Approved, Rejected and All, each carrying
|                          its count, so what is left is legible before it is
|                          opened
|   a set, not a row       days are selected and decided together, grouped
|                          back into the days they belong to on the way out
|   a trail, not a flag    every decision keeps who made it, when, and why,
|                          and can be revisited when the day turns out to have
|                          been something else
|
| Who may open it is Roles & Access - `attendance.approvals`, given to HR and
| to managers by default and withheld from employees. Whose days they may
| decide is the department scope, which is a different question and is asked
| per row: a manager sees the departments they run, their own day sits in the
| list with the buttons withheld, and HR signs that one off.
|
| Both are enforced rather than offered. The company code is withheld from the
| two reads below for a role that cannot review, so nobody else's attendance is
| ever fetched, and every decision re-asks the scope before it is written.
|--------------------------------------------------------------------------
*/

const SEARCH_FIELDS = [
  "employeeName",
  "employeeId",
  "department",
  "designation",
];

const EMPTY_SELECTION = new Set();

function AttendanceApprovals() {

  const { company, currentUser } = useAuth();

  const canReviewAtAll = isApprover(currentUser);

  /*
  | Withheld from a role that cannot review, so the directory and the month of
  | records are never fetched rather than being fetched and then hidden.
  */
  const companyCode = canReviewAtAll ? company?.companyCode : "";

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const today = useMemo(() => new Date(), []);

  const [period, setPeriod] = useState(() => {

    const year = today.getFullYear();

    const month = today.getMonth() + 1;

    /*
    | The month opens on itself, cut off at today: a queue that offers next
    | week is a queue with a fortnight of empty rows above the work.
    */
    return { year, month, ...getMonthRange(year, month) };

  });

  const [queue, setQueue] = useState(APPROVAL_STATUS.PENDING);

  const [department, setDepartment] = useState("");

  const [status, setStatus] = useState("");

  const [selected, setSelected] = useState(EMPTY_SELECTION);

  const [detailRecord, setDetailRecord] = useState(null);

  /*
  | The row being rejected, which is also what opens the remarks box, and the
  | row currently being written. The busy key is the row's own key, so only the
  | buttons of the day being decided are closed and the rest of the queue stays
  | usable while one write is in flight.
  */
  const [rejectRecord, setRejectRecord] = useState(null);

  const [statusRecord, setStatusRecord] = useState(null);

  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const [busyKey, setBusyKey] = useState("");

  const [rejecting, setRejecting] = useState(false);

  const [savingStatus, setSavingStatus] = useState(false);

  const [quickSaving, setQuickSaving] = useState(false);

  const [bulkBusy, setBulkBusy] = useState(false);

  const {
    directory,
    departments,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  /*
  | Every one of these passes its argument straight back for an owner and for
  | HR, so the queue below is the whole company's for them without the page
  | branching on the role first.
  */
  const {
    canReview: canReviewRecord,
    filterRows,
    isScoped,
    departments: myDepartments,
    loading: scopeLoading,
  } = useManagerScope();

  const {
    records,
    loading: recordsLoading,
    error: recordsError,
    reload: reloadRecords,
    approve,
    reject,
    changeStatus,
    approveMany,
    rejectMany,
  } = useAttendanceApprovals(companyCode, period.year, period.month);

  useEffect(() => {

    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };

  }, [setSearch, setSearchPlaceholder]);

  /*
  |--------------------------------------------------------------------------
  | The Queue
  |--------------------------------------------------------------------------
  | Narrowed once, in one order, and every count on the page is taken from the
  | same step of it. The cards, the four tab counts and the table are all
  | reading `visible`, so a filtered view cannot report eleven pending days on
  | a tab and then list four.
  |
  | The queue tab is applied last, and only to the table: the tabs have to be
  | able to say how many days are in the tab beside the one being read.
  */

  const scoped = useMemo(
    () => filterRows(attachEmployeeDetails(records, directory)),
    [filterRows, records, directory]
  );

  const inPeriod = useMemo(
    () => filterByDateRange(scoped, period.from, period.to),
    [scoped, period.from, period.to]
  );

  const visible = useMemo(
    () =>
      searchRows(inPeriod, search, SEARCH_FIELDS).filter(
        (record) =>
          (!department || record.department === department) &&
          (!status || record.status === status)
      ),
    [inPeriod, search, department, status]
  );

  const summary = useMemo(
    () => getApprovalSummary(visible),
    [visible]
  );

  const queueRows = useMemo(
    () => filterByApproval(visible, queue),
    [visible, queue]
  );

  /*
  | What the bulk bar may act on, and what of it is picked. Both are resolved
  | here rather than inside the table, because this is where the writes are
  | made: a count rendered from one list and a write walking another is the
  | one disagreement this screen cannot afford.
  |
  | Only a pending day this reviewer may decide is ever selectable. A decision
  | that has already been made can still be changed - from its own row, one at
  | a time, which is the deliberate weight that belongs on revisiting one.
  */

  const selectableRows = useMemo(
    () =>
      queueRows.filter(
        (record) =>
          isPendingApproval(record) && canReviewRecord(record)
      ),
    [queueRows, canReviewRecord]
  );

  const selectedRows = useMemo(
    () =>
      selectableRows.filter((record) =>
        selected.has(getRecordKey(record))
      ),
    [selectableRows, selected]
  );

  /*
  | The filter offers only the departments the queue can contain. Left
  | unnarrowed, every option but the manager's own would empty the table.
  */
  const departmentOptions = useMemo(
    () =>
      isScoped
        ? myDepartments.map((item) => item.name)
        : departments,
    [isScoped, myDepartments, departments]
  );

  const monthLabel = getMonthLabel(period.year, period.month);

  const isCurrentMonth =
    period.year === today.getFullYear() &&
    period.month === today.getMonth() + 1;

  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  const loading = recordsLoading || directoryLoading || scopeLoading;

  /*
  |--------------------------------------------------------------------------
  | Selection
  |--------------------------------------------------------------------------
  | Cleared whenever the queue underneath it moves. A selection made on the
  | pending tab and then carried into another month would be a set of days the
  | reviewer can no longer see, and the bulk bar would be offering to decide
  | them sight unseen.
  */

  const clearSelection = () => setSelected(EMPTY_SELECTION);

  const handleSelect = (record) => {

    const key = getRecordKey(record);

    setSelected((current) => {

      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;

    });

  };

  const handleSelectAll = (checked) => {

    setSelected(
      checked
        ? new Set(selectableRows.map(getRecordKey))
        : EMPTY_SELECTION
    );

  };

  const handleMonthChange = (direction) => {

    const next = shiftMonth(period.year, period.month, direction);

    setPeriod({ ...next, ...getMonthRange(next.year, next.month) });

    clearSelection();

  };

  const handleQueueChange = (value) => {
    setQueue(value);
    clearSelection();
  };

  const handleFilterChange = (key, value) => {

    if (key === "department") {
      setDepartment(value);
    } else if (key === "status") {
      setStatus(value);
    } else {
      setPeriod((current) => ({ ...current, [key]: value }));
    }

    clearSelection();

  };

  const handleRetry = () => {
    reloadRecords();
    reloadDirectory();
  };

  /*
  |--------------------------------------------------------------------------
  | Deciding
  |--------------------------------------------------------------------------
  | Every one of the four re-asks the question the buttons were drawn from.
  | They are already withheld on a row that is not this reviewer's, so this is
  | the second line and not the first - but a decision reached through a stale
  | render is still a decision that gets written, and this one moves what a
  | month of attendance is worth.
  */

  const refuseOutOfScope = (record) => {

    if (canReviewRecord(record)) return false;

    toast.error("This employee is not in a department you manage.");

    return true;

  };

  const handleApprove = async (record) => {

    if (refuseOutOfScope(record)) return;

    setBusyKey(getRecordKey(record));

    try {

      const result = await approve(record, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve attendance.");
        return;
      }

      toast.success(
        `${record.employeeName || record.employeeId}'s attendance approved.`
      );

      setDetailRecord(null);

    } catch (approveError) {

      console.error(approveError);
      toast.error("Failed to approve attendance.");

    } finally {

      setBusyKey("");

    }

  };

  const handleReject = async (remarks) => {

    if (!rejectRecord) return;

    if (refuseOutOfScope(rejectRecord)) {
      setRejectRecord(null);
      return;
    }

    setRejecting(true);

    try {

      const result = await reject(rejectRecord, actorName, remarks);

      if (!result?.success) {
        toast.error(result?.message || "Failed to reject attendance.");
        return;
      }

      toast.success("Attendance rejected.");

      setRejectRecord(null);
      setDetailRecord(null);

    } catch (rejectError) {

      console.error(rejectError);
      toast.error("Failed to reject attendance.");

    } finally {

      setRejecting(false);

    }

  };

  /*
  | Correcting the day rather than deciding it as recorded. The modal hands
  | back the whole record it built, so the write is one call and this only
  | reports the outcome.
  |
  | The scope is re-asked here too: correcting a day is the strongest of the
  | three writes on this screen - it changes what the day was, not only what
  | was decided about it.
  */
  const handleChangeStatus = async (record) => {

    if (!statusRecord || refuseOutOfScope(statusRecord)) {
      return { success: false };
    }

    setSavingStatus(true);

    try {

      const result = await changeStatus(record, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to update the day.");
        return result;
      }

      toast.success(
        `${statusRecord.employeeName || statusRecord.employeeId}'s day updated to ${record.status} and approved.`
      );

      setStatusRecord(null);
      setDetailRecord(null);

      return result;

    } catch (statusError) {

      console.error(statusError);
      toast.error("Failed to update the day.");

      return { success: false };

    } finally {

      setSavingStatus(false);

    }

  };

  /*
  | The same write, reached from the status pill on the detail modal.
  |
  | This one is not a correction: the punches are right and are passed straight
  | back as they were recorded, so the day still shows the 10:40 arrival - only
  | what it is worth changes. That is the whole point of it. An employee who is
  | late every morning is marked Half Day for it, and the punch in that earned
  | him that stays on the record as the reason.
  |
  | It is a separate handler rather than a second caller of the one above
  | because that one answers to the correction modal and re-asks the scope of
  | the row that opened it. Here the row is the record itself, and it is the
  | full one off the queue - department and all - so the scope question is
  | asked of the same object the buttons were drawn from.
  */
  const handleQuickStatusChange = async (record, status) => {

    if (!record || refuseOutOfScope(record)) {
      return { success: false };
    }

    setQuickSaving(true);

    try {

      /*
      | Only the status is chosen here, so everything else is handed back
      | untouched. The service rebuilds `punchInTime`, `punchOutTime` and the
      | working hours from these two timestamps, so passing them through is
      | what keeps the day identical apart from what it counts as.
      */
      const result = await changeStatus(
        {
          employeeId: record.employeeId,
          date: record.date,
          punchIn: record.punchIn || null,
          punchOut: record.punchOut || null,
          status,
          remarks: record.remarks || "",
        },
        actorName
      );

      if (!result?.success) {
        toast.error(result?.message || "Failed to update the day.");
        return result;
      }

      toast.success(
        `${record.employeeName || record.employeeId}'s day updated to ${status} and approved.`
      );

      setDetailRecord(null);

      return result;

    } catch (statusError) {

      console.error(statusError);
      toast.error("Failed to update the day.");

      return { success: false };

    } finally {

      setQuickSaving(false);

    }

  };

  /*
  | The selection, signed off together. The list is re-narrowed here rather
  | than taken as it stands: the month is re-read after every write, so a day
  | somebody else decided while this selection was sitting on screen is no
  | longer this reviewer's to approve.
  */
  const handleApproveSelected = async () => {

    const rows = selectedRows.filter(canReviewRecord);

    if (rows.length === 0) {
      toast.error("Nothing in the selection is yours to approve.");
      return;
    }

    setBulkBusy(true);

    try {

      const result = await approveMany(rows, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve the selection.");
        return;
      }

      toast.success(
        result.approved === 0
          ? "Nothing was left to approve."
          : `${result.approved} ${result.approved === 1 ? "day" : "days"} of attendance approved.`
      );

      clearSelection();

    } catch (bulkError) {

      console.error(bulkError);
      toast.error("Failed to approve the selection.");

    } finally {

      setBulkBusy(false);

    }

  };

  const handleRejectSelected = async (remarks) => {

    const rows = selectedRows.filter(canReviewRecord);

    if (rows.length === 0) {
      toast.error("Nothing in the selection is yours to reject.");
      setBulkRejectOpen(false);
      return;
    }

    setBulkBusy(true);

    try {

      const result = await rejectMany(rows, actorName, remarks);

      if (!result?.success) {
        toast.error(result?.message || "Failed to reject the selection.");
        return;
      }

      /*
      | The skipped count is reported rather than swallowed. A day the service
      | refused - already rejected by somebody else while this was open - is
      | the one thing a reviewer would otherwise walk away believing they had
      | just decided.
      */
      toast.success(
        result.skipped > 0
          ? `${result.rejected} rejected, ${result.skipped} skipped.`
          : `${result.rejected} ${result.rejected === 1 ? "day" : "days"} of attendance rejected.`
      );

      setBulkRejectOpen(false);
      clearSelection();

    } catch (bulkError) {

      console.error(bulkError);
      toast.error("Failed to reject the selection.");

    } finally {

      setBulkBusy(false);

    }

  };

  /*
  | The detail modal reads from the live queue, so a day decided while it is
  | open shows the decision instead of the state it was opened in.
  */
  const activeDetail = useMemo(
    () =>
      detailRecord
        ? visible.find(
          (record) =>
            getRecordKey(record) === getRecordKey(detailRecord)
        ) || detailRecord
        : null,
    [detailRecord, visible]
  );

  /*
  |--------------------------------------------------------------------------
  | Access
  |--------------------------------------------------------------------------
  | The route guard already answers whether this role may open the screen. This
  | second answer is about the record rather than the screen: the queue holds
  | every employee's attendance, so it is only ever drawn for a role that
  | reviews other people's days.
  |
  | Rather than a dead end, the employee is pointed at what they came here for.
  */

  if (!canReviewAtAll) {

    return (

      <div className="mx-auto max-w-[1600px] p-0 sm:p-2">

        <AttendancePageHeader
          title="Attendance Approval"
          subtitle="Review, approve and reject recorded days"
          icon={<FiCheckSquare />}
        />

        <div className="ui-card mt-6 flex flex-col items-center justify-center px-4 py-14 text-center sm:mt-8 sm:px-6 sm:py-20">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiLock size={28} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
            Approvals are restricted
          </h3>

          <p className="mt-2 max-w-sm text-sm text-ink-subtle">
            Only HR, department managers and the company owner can approve
            attendance. Your own days are on My Attendance, and a day that was
            recorded wrongly can be corrected from Regularization.
          </p>

          <Link
            to="/attendance/my"
            className="ui-btn ui-btn-primary mt-6 font-semibold"
          >
            <FiUser />
            View My Attendance
          </Link>

        </div>

      </div>

    );

  }

  return (
    <div className="mx-auto max-w-[1600px] p-0 sm:p-2">

      <AttendancePageHeader
        title="Attendance Approval"
        subtitle={`Review and decide recorded days for ${monthLabel}`}
        icon={<FiCheckSquare />}
        action={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">

            <MonthNavigator
              label={monthLabel}
              onChange={handleMonthChange}
              disableNext={isCurrentMonth}
            />

            {/*
            | The whole queue in one action, and it says how much: a button
            | reading "Approve All" over an empty queue is a button that does
            | nothing, so it is only offered when there is something in it.
            |
            | It decides exactly the pending days currently in view - the same
            | set the tab counts - so a filtered queue is cleared to what the
            | reviewer is actually looking at and never past it.
            */}
            {selectableRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelected(
                    new Set(selectableRows.map(getRecordKey))
                  );
                }}
                disabled={bulkBusy}
                className="ui-btn ui-btn-secondary w-full font-semibold md:w-auto"
              >
                <FiCheckSquare />
                Select All Pending ({selectableRows.length})
              </button>
            )}

          </div>
        }
      />

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        {/*
        | Above everything else, because it explains the whole page rather
        | than one panel of it: a manager's queue is their departments, and
        | nothing else on screen would otherwise say so.
        */}
        <DepartmentScopeNotice subject="attendance" />

        <ApprovalStatCards summary={summary} loading={loading} />

        <ApprovalTable
          records={queueRows}
          loading={loading}
          error={recordsError || directoryError}
          onRetry={handleRetry}
          search={search}
          departments={departmentOptions}

          queue={queue}
          onQueueChange={handleQueueChange}
          summary={summary}

          filters={{
            department,
            status,
            from: period.from,
            to: period.to,
          }}
          onFilterChange={handleFilterChange}

          selected={selected}
          selectableRows={selectableRows}
          selectedRows={selectedRows}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={clearSelection}

          canReview={canReviewRecord}
          busyKey={busyKey}
          bulkBusy={bulkBusy}

          onApprove={handleApprove}
          onReject={setRejectRecord}
          onView={setDetailRecord}
          onApproveSelected={handleApproveSelected}
          onRejectSelected={() => setBulkRejectOpen(true)}

          periodLabel={`${period.from}-to-${period.to}`}
        />

      </div>

      <ApprovalDetailModal
        open={Boolean(activeDetail)}
        record={activeDetail}
        canReview={canReviewRecord(activeDetail)}
        busy={busyKey === getRecordKey(activeDetail || {})}
        savingStatus={quickSaving}
        onApprove={handleApprove}
        onReject={(record) => {
          setRejectRecord(record);
          setDetailRecord(null);
        }}
        onStatusChange={handleQuickStatusChange}
        onChangeStatus={setStatusRecord}
        onClose={() => setDetailRecord(null)}
      />

      {/*
      | Correcting the day, which is the other half of the question the pill
      | on the detail modal answers. The pill overrides a day whose punches
      | are right; this is for the day whose punches are not, and it is still
      | a form rather than a dropdown because changing when a day started
      | needs the times and a reason beside the status.
      |
      | Neither of them writes on selection. A select that rewrites a record
      | the moment it loses focus is the wrong weight for a decision that
      | re-signs somebody's day, so both ask before they save.
      */}
      <ChangeStatusModal
        open={Boolean(statusRecord)}
        record={statusRecord}
        saving={savingStatus}
        onSave={handleChangeStatus}
        onClose={() => setStatusRecord(null)}
      />

      <RejectRequestModal
        open={Boolean(rejectRecord)}
        onClose={() => setRejectRecord(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRecord?.employeeName}
        title="Reject Attendance"
        subject="attendance for this day"
        confirmLabel="Reject Attendance"
        loadingLabel="Rejecting..."
        placeholder="Enter the reason for rejecting this day of attendance..."
      />

      {/*
      | The same box for a set of days. The reason is asked for once and
      | written onto every one of them, which is the honest thing to do: a
      | reviewer turning down eleven days in one action has one reason for it,
      | and eleven copies of a blank field would only be filled in once anyway.
      */}
      <RejectRequestModal
        open={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        onConfirm={handleRejectSelected}
        loading={bulkBusy}
        title="Reject Selected Days"
        subject={`selection of ${selectedRows.length} ${selectedRows.length === 1 ? "day" : "days"}`}
        confirmLabel={`Reject ${selectedRows.length} ${selectedRows.length === 1 ? "Day" : "Days"}`}
        loadingLabel="Rejecting..."
        placeholder="Enter the reason for rejecting these days of attendance..."
      />

    </div>
  );

}

export default AttendanceApprovals;
