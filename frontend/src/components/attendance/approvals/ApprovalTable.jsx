import { useEffect, useRef } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiEye,
  FiInbox,
  FiLoader,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import {
  APPROVAL_STATUS,
  ATTENDANCE_STATUS_OPTIONS,
} from "../../../utils/attendance/attendanceConstants";
import {
  formatDate,
  formatTime,
  parseDateKey,
} from "../../../utils/attendance/attendanceDate";
import { getRecordKey } from "../../../utils/attendance/attendanceApproval";
import {
  getApprovalLabel,
  getApprovalStatus,
} from "../../../utils/attendance/attendanceUtils";
import { FilterSelect } from "../common/AttendancePanel";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import DataTable from "../common/DataTable";
import EmployeeCell from "../common/EmployeeCell";
import ApprovalQueueTabs from "./ApprovalQueueTabs";

/*
|--------------------------------------------------------------------------
| Approval Table
|--------------------------------------------------------------------------
| The desk itself: the queue tabs, the period filters, the selection, the bulk
| bar and the rows.
|
| It is one component rather than five because all of it is one control. The
| tab decides what the rows are, the filters decide which of them are listed,
| the selection is taken from that list and the bulk bar acts on the selection
| - split apart, each piece would need the other four passed into it, and the
| four counts on screen would have four chances to disagree.
|
| The rows arrive already joined with the employee directory and already
| narrowed to the departments the reviewer runs. This component never decides
| who may review anything: `canReview` comes in as a predicate and is asked per
| row, so a manager's own day sits in the list with its decisions withheld
| instead of quietly disappearing from a queue they are entitled to watch.
|
| Eight columns, not eleven. The three times used to be a column each, which
| pushed the table past what a laptop can show and put the decision - the
| reason anybody opened this screen - behind a horizontal scrollbar. They are
| one cell now, read the way a day is actually read: in, out, and how long
| that came to.
|--------------------------------------------------------------------------
*/

const HIDDEN_UNTIL = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const hideBelow = (breakpoint) => ({
  headerClassName: HIDDEN_UNTIL[breakpoint],
  className: HIDDEN_UNTIL[breakpoint],
});

const ACTION_BUTTON =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const DECISION_BUTTON =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const CHECKBOX =
  "h-4 w-4 cursor-pointer rounded border-line accent-brand disabled:cursor-not-allowed disabled:opacity-40";

/*
|--------------------------------------------------------------------------
| Select All
|--------------------------------------------------------------------------
| `indeterminate` is a property and not an attribute, so it cannot be written
| in JSX and has to be set on the node itself. It is the state the header
| spends most of its time in - some of the queue picked, not all of it - so a
| plain checked / unchecked box would be lying for most of a review session.
*/

function SelectAllCheckbox({ checked, indeterminate, disabled, onChange, count }) {

  const ref = useRef(null);

  useEffect(() => {

    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }

  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={`Select all ${count} pending days in this view`}
      title={
        disabled
          ? "Nothing in this view is waiting on your decision"
          : `Select all ${count} pending days in this view`
      }
      className={CHECKBOX}
    />
  );

}

/*
|--------------------------------------------------------------------------
| Day Tile
|--------------------------------------------------------------------------
| The date as a calendar tile rather than a sentence.
|
| A queue spans a month, so the date is scanned far more often than it is
| read: a reviewer works down the column looking for the day they are dealing
| with, not for the words "Mon, 05 Aug". The number carries the eye and the
| weekday underneath is what says whether the day should have been worked at
| all.
*/

function DayTile({ date }) {

  const parsed = parseDateKey(date);

  if (!parsed) {
    return <span className="text-sm text-ink-faint">--</span>;
  }

  return (
    <div className="flex w-13 flex-col items-center rounded-xl border border-line-subtle bg-surface-muted px-2 py-1.5">

      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        {parsed.toLocaleDateString("en-IN", { weekday: "short" })}
      </span>

      <span className="text-lg font-bold leading-tight text-ink">
        {String(parsed.getDate()).padStart(2, "0")}
      </span>

      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {parsed.toLocaleDateString("en-IN", { month: "short" })}
      </span>

    </div>
  );

}

/*
|--------------------------------------------------------------------------
| Work Day
|--------------------------------------------------------------------------
| Both punches and the hours they came to, in one cell. The arrow is what
| makes it read as a span rather than as two unrelated timestamps, and the
| hours sit under it because they are the conclusion drawn from the pair.
*/

function WorkDay({ record }) {
  return (
    <div className="min-w-0">

      <div className="flex items-center gap-1.5 whitespace-nowrap">

        <span className="font-semibold text-ink-muted">
          {formatTime(record.punchIn)}
        </span>

        <FiArrowRight className="shrink-0 text-ink-faint" size={13} />

        <span className="font-semibold text-ink-muted">
          {formatTime(record.punchOut)}
        </span>

      </div>

      <span className="mt-1 inline-flex whitespace-nowrap rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-subtle">
        {record.workingHours || "--"}
      </span>

    </div>
  );
}

function ApprovalTable({
  records = [],
  loading = false,
  error = "",
  onRetry,
  search = "",
  departments = [],

  /* The queue tab and the counts the tabs are labelled with. */
  queue = APPROVAL_STATUS.PENDING,
  onQueueChange,
  summary,

  /* `{ department, status, from, to }`, owned by the page. */
  filters,
  onFilterChange,

  /*
  | Selection. The set and both derived lists are owned by the page, because
  | the page is what writes the decision - a bulk bar counting one list while
  | the handler behind it walked another is the one bug this screen cannot
  | afford.
  */
  selected,
  selectableRows = [],
  selectedRows = [],
  onSelect,
  onSelectAll,
  onClearSelection,

  canReview = () => false,
  busyKey = "",
  bulkBusy = false,

  onApprove,
  onReject,
  onView,
  onApproveSelected,
  onRejectSelected,

}) {

  /*
  | A day is selectable only when it is both waiting and this reviewer's to
  | decide. The bulk actions are a queue clearing tool: a day already signed
  | off is revisited one at a time, on purpose, from its own row.
  */
  const isSelectable = (record) =>
    getApprovalStatus(record) === APPROVAL_STATUS.PENDING &&
    canReview(record);

  const allSelected =
    selectableRows.length > 0 &&
    selectedRows.length === selectableRows.length;

  const showSelection = selectableRows.length > 0 || selected.size > 0;

  /*
  | Three buttons, no menu. Approve and reject are what the screen is for and
  | are pressed hundreds of times a month; the third opens the day in full,
  | which is where correcting what the day was already lives - so a menu whose
  | only remaining entry duplicated the modal behind it was a click in the way
  | of the one action it was hiding.
  |
  | A row that is not this reviewer's keeps the eye and loses the decisions -
  | left out rather than disabled, because a disabled control says "not yet"
  | and this is "not yours".
  */
  const rowActions = (record) => {

    const status = getApprovalStatus(record);

    const busy = busyKey === getRecordKey(record);

    const reviewable = canReview(record);

    return (
      <div className="flex items-center justify-end gap-1.5">

        {reviewable && (
          <>

            <button
              type="button"
              onClick={() => onApprove(record)}
              disabled={busy || status === APPROVAL_STATUS.APPROVED}
              aria-label="Approve this day"
              title="Approve this day"
              className={`${DECISION_BUTTON} border-emerald-200 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 focus:ring-emerald-300`}
            >
              {busy ? (
                <FiLoader className="animate-spin" size={15} />
              ) : (
                <FiCheck size={16} />
              )}
              <span className="hidden 2xl:inline">Approve</span>
            </button>

            <button
              type="button"
              onClick={() => onReject(record)}
              disabled={busy || status === APPROVAL_STATUS.REJECTED}
              aria-label="Reject this day"
              title="Reject this day"
              className={`${DECISION_BUTTON} border-red-200 text-red-700 hover:border-red-500 hover:bg-red-50 focus:ring-red-300`}
            >
              <FiX size={16} />
              <span className="hidden 2xl:inline">Reject</span>
            </button>

          </>
        )}

        <button
          type="button"
          onClick={() => onView(record)}
          aria-label="View this day"
          title="View this day"
          className={`${ACTION_BUTTON} border-line text-ink-subtle hover:border-brand hover:bg-brand/5 hover:text-brand focus:ring-brand-ring`}
        >
          <FiEye size={16} />
        </button>

      </div>
    );

  };

  /*
  | The decision, with who made it under it. On a queue that can be revisited,
  | "Approved" on its own is half the answer - the name beside it is what a
  | second reviewer needs before changing it.
  */
  const approvalCell = (record) => (
    <div className="min-w-0">

      <AttendanceStatusBadge
        status={getApprovalLabel(record)}
        variant="approval"
        size="sm"
      />

      {record.approvedBy && (
        <p className="mt-1 truncate text-xs text-ink-subtle">
          by {record.approvedBy}
        </p>
      )}

    </div>
  );

  /*
  | Rebuilt every render rather than memoised. Most of the cells close over
  | something that moves - the selection, the busy row, the handlers the page
  | rebuilds as its own state changes - and a memo held past any of them is a
  | row of buttons acting on a queue that has already moved on. Eight
  | descriptors is not a cost worth that risk.
  */
  const columns = [

    ...(showSelection
      ? [
        {
          key: "select",
          /*
          | The header is the select all box itself. It covers the whole
          | queue in view and not just the page on screen: a reviewer who
          | filtered down to one department and pressed it means that
          | department, not the first eight rows of it.
          */
          label: (
            <SelectAllCheckbox
              checked={allSelected}
              indeterminate={selectedRows.length > 0 && !allSelected}
              disabled={selectableRows.length === 0}
              onChange={onSelectAll}
              count={selectableRows.length}
            />
          ),
          /*
          | `w-px` is how a table column is told to be as narrow as its
          | contents: the width is a suggestion under `table-layout: auto`,
          | so the cell settles at the checkbox plus its padding instead of
          | taking an equal share of the row.
          */
          className: "w-px",
          headerClassName: "w-px",
          render: (record) =>
            isSelectable(record) ? (
              <input
                type="checkbox"
                checked={selected.has(getRecordKey(record))}
                onChange={() => onSelect(record)}
                aria-label={`Select ${record.employeeName || record.employeeId} on ${formatDate(record.date)}`}
                className={CHECKBOX}
              />
            ) : null,
        },
      ]
      : []),

    {
      key: "date",
      label: "Date",
      sortable: true,
      className: "w-px",
      headerClassName: "w-px",
      render: (record) => <DayTile date={record.date} />,
    },

    {
      key: "employeeName",
      label: "Employee",
      sortable: true,
      render: (record) => (
        <div className="min-w-0">

          <EmployeeCell
            name={record.employeeName}
            employeeId={record.employeeId}
          />

          {/*
          | The department column, folded back in below `xl` where it is not
          | rendered. The span disappears at exactly the breakpoint its own
          | column appears at, so it is never shown twice.
          */}
          <p className="mt-1.5 truncate text-xs text-ink-subtle xl:hidden">
            {record.department || "--"}
            {record.designation ? ` · ${record.designation}` : ""}
          </p>

        </div>
      ),
    },

    {
      key: "department",
      label: "Department",
      sortable: true,
      ...hideBelow("xl"),
      render: (record) => (
        <>
          <p className="font-medium text-ink-muted">
            {record.department || "--"}
          </p>
          <p className="text-xs text-ink-faint">
            {record.designation || ""}
          </p>
        </>
      ),
    },

    /*
    | Keyed on the punch in, so the column sorts by when the day started -
    | which is the order a morning of arrivals is actually read in.
    */
    {
      key: "punchIn",
      label: "Work Day",
      sortable: true,
      render: (record) => <WorkDay record={record} />,
    },

    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (record) => (
        <AttendanceStatusBadge status={record.status} size="sm" />
      ),
    },

    {
      key: "approvalStatus",
      label: "Approval",
      sortable: true,
      render: approvalCell,
    },

    {
      key: "actions",
      label: "Actions",
      align: "center",
      className: "whitespace-nowrap",
      render: rowActions,
    },

  ];

  /*
  | Phones get a card per day rather than an eight column table dragged
  | sideways: the day tile and who it belongs to on top, the punches as a row
  | of their own, and the decision with its actions on a line at the bottom.
  */
  const mobileCard = (record) => (
    <div className="space-y-3">

      <div className="flex items-start gap-3">

        {isSelectable(record) && (
          <input
            type="checkbox"
            checked={selected.has(getRecordKey(record))}
            onChange={() => onSelect(record)}
            aria-label={`Select ${record.employeeName || record.employeeId} on ${formatDate(record.date)}`}
            className={`mt-4 shrink-0 ${CHECKBOX}`}
          />
        )}

        <DayTile date={record.date} />

        <div className="min-w-0 flex-1">

          <EmployeeCell
            name={record.employeeName}
            employeeId={record.employeeId}
            subtitle={record.department || record.employeeId}
            size="sm"
          />

          <div className="mt-2">
            <AttendanceStatusBadge status={record.status} size="sm" />
          </div>

        </div>

      </div>

      <div className="rounded-xl bg-surface-muted px-3 py-2.5">
        <WorkDay record={record} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">

        {approvalCell(record)}

        {rowActions(record)}

      </div>

    </div>
  );

  return (
    <div className="ui-card overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">

        <div className="min-w-0">

          <h2 className="ui-card-title">
            Approval Queue
          </h2>

          <p className="ui-card-subtitle">
            {summary.pending > 0
              ? `${summary.pending} day${summary.pending === 1 ? "" : "s"} awaiting a decision`
              : "Nothing is waiting on a decision"}
          </p>

        </div>

        <div className="shrink-0">

          {/*
          | The month is a one shot read rather than a live subscription, so
          | the refresh is offered plainly instead of a Live badge that would
          | be claiming something untrue.
          */}
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="ui-btn ui-btn-secondary font-semibold"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

        </div>

      </div>

      {/* Queue */}
      <ApprovalQueueTabs
        value={queue}
        onChange={onQueueChange}
        summary={summary}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 border-b border-line-subtle bg-surface-muted/60 px-4 py-3.5 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">

        {/*
        | One control for the period rather than two fields under two labels.
        | The pair is a single idea - the days being reviewed - and splitting
        | it into "From" and "To" boxes made the filter row read as four
        | unrelated dropdowns instead of one range and two filters.
        */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-ring sm:col-span-2">

          <FiCalendar className="shrink-0 text-ink-faint" />

          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) =>
              onFilterChange("from", event.target.value)
            }
            aria-label="From date"
            className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-ink outline-none"
          />

          <FiArrowRight className="shrink-0 text-ink-faint" size={14} />

          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) =>
              onFilterChange("to", event.target.value)
            }
            aria-label="To date"
            className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-ink outline-none"
          />

        </div>

        <FilterSelect
          value={filters.department}
          onChange={(value) => onFilterChange("department", value)}
          options={departments}
          placeholder="All Departments"
          ariaLabel="Filter by department"
        />

        <FilterSelect
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
          options={ATTENDANCE_STATUS_OPTIONS}
          placeholder="All Status"
          ariaLabel="Filter by attendance status"
        />

      </div>

      {/*
      | The bulk bar. It appears only with something selected, so the row is
      | never a strip of disabled buttons sitting over an untouched queue, and
      | it says exactly how many days the two buttons would decide.
      */}
      {selectedRows.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-line-subtle bg-brand/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="flex min-w-0 items-center gap-2.5">

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FiCheckCircle size={16} />
            </span>

            <p className="min-w-0 text-sm font-semibold text-ink">

              {selectedRows.length} day
              {selectedRows.length === 1 ? "" : "s"} selected

              <button
                type="button"
                onClick={onClearSelection}
                className="ml-2 cursor-pointer text-xs font-semibold text-brand hover:underline"
              >
                Clear
              </button>

            </p>

          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            <button
              type="button"
              onClick={onRejectSelected}
              disabled={bulkBusy}
              className="ui-btn border border-red-200 bg-red-50 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX />
              Reject Selected
            </button>

            <button
              type="button"
              onClick={onApproveSelected}
              disabled={bulkBusy}
              className="ui-btn bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkBusy ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiCheck />
              )}
              {bulkBusy
                ? "Working..."
                : `Approve Selected (${selectedRows.length})`}
            </button>

          </div>

        </div>
      )}

      <DataTable
        columns={columns}
        rows={records}
        rowKey={getRecordKey}
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingMessage="Loading the approval queue..."
        defaultSortBy="date"
        defaultSortOrder="desc"
        resetKey={`${search}|${queue}|${filters.department}|${filters.status}|${filters.from}|${filters.to}`}
        paginationLabel="days"
        mobileCard={mobileCard}
        /*
        | Three columns lighter than it started, so a laptop reads the whole
        | row - the decision included - without dragging the table sideways.
        */
        minWidthClass="min-w-[720px] lg:min-w-[840px] xl:min-w-[1020px]"
        /*
        | A picked row is tinted rather than only ticked. The tick is 16px at
        | the far left of a wide row, and a bulk bar offering to decide eleven
        | days needs those eleven to be obvious from across the table.
        */
        rowClassName={(record) =>
          selected.has(getRecordKey(record))
            ? "bg-brand/5"
            : ""
        }
        empty={{
          icon: <FiInbox size={28} />,
          title:
            queue === APPROVAL_STATUS.PENDING
              ? "The queue is clear"
              : "No Days Found",
          message:
            queue === APPROVAL_STATUS.PENDING
              ? "Every recorded day in this period has been decided."
              : "No recorded day in this period matches the current filters.",
        }}
      />

    </div>
  );

}

export default ApprovalTable;
