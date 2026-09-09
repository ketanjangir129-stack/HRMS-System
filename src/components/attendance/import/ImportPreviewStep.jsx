import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiInbox,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

import DataTable from "../common/DataTable";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import { formatDayLabel } from "../../../utils/attendance/attendanceDate";
import {
  PREVIEW_PAGE_SIZE,
  ROW_OUTCOME,
} from "../../../utils/attendance/attendanceImportConstants";
import {
  PREVIEW_FILTER,
  filterPreviewRows,
  getOutcomeLabel,
  getRowOutcome,
} from "../../../utils/attendance/attendanceImportValidation";
import { formatImportMinutes } from "../../../utils/attendance/attendanceImportNormalize";

/*
|--------------------------------------------------------------------------
| Step Five - Preview
|--------------------------------------------------------------------------
| The rows themselves, row by row, with nothing written yet.
|
| Paginated by the module's own `DataTable`, which is what keeps this screen
| usable on a file of a hundred thousand rows: only the page being looked at is
| ever rendered. The derived values in the cells - the times, the outcome
| label - are worked out inside the render functions rather than mapped over
| the whole file first, so a filter change costs one page of work rather than a
| second copy of the import in memory.
|
| The filters are the outcomes, and every row has exactly one, so the counts on
| the tabs always add up to the total. A tab with nothing behind it is left out
| rather than shown empty: on a clean file that leaves two tabs, which is the
| honest shape of a clean file.
|--------------------------------------------------------------------------
*/

const OUTCOME_STYLES = {
  [ROW_OUTCOME.NEW]: "bg-emerald-50 text-emerald-700",
  [ROW_OUTCOME.EXISTING]: "bg-blue-50 text-blue-700",
  [ROW_OUTCOME.DUPLICATE]: "bg-amber-50 text-amber-700",
  [ROW_OUTCOME.UNMATCHED]: "bg-red-50 text-red-700",
  [ROW_OUTCOME.INVALID]: "bg-red-50 text-red-700",
  [ROW_OUTCOME.CONFLICT]: "bg-purple-50 text-purple-700",
};

function OutcomeBadge({ outcome }) {

  return (
    <span
      className={`ui-badge ${OUTCOME_STYLES[outcome] || "bg-surface-raised text-ink-muted"}`}
    >
      {getOutcomeLabel(outcome)}
    </span>
  );

}

/*
| The errors and warnings on one row. Errors first and never truncated away:
| the reason a row is not importing is the whole point of the row being on
| this screen.
*/
function RowIssues({ row }) {

  if (row.errors.length === 0 && row.warnings.length === 0) {
    return <span className="text-ink-faint">--</span>;
  }

  return (
    <ul className="space-y-1">

      {row.errors.map((message, index) => (
        <li
          key={`error-${index}`}
          className="flex items-start gap-1.5 text-xs text-red-600"
        >
          <FiXCircle className="mt-0.5 shrink-0" size={12} />
          <span>{message}</span>
        </li>
      ))}

      {row.warnings.map((message, index) => (
        <li
          key={`warning-${index}`}
          className="flex items-start gap-1.5 text-xs text-amber-700"
        >
          <FiAlertTriangle className="mt-0.5 shrink-0" size={12} />
          <span>{message}</span>
        </li>
      ))}

    </ul>
  );

}

function ImportPreviewStep({ rows, summary, mode, onBack, onImport }) {

  const [filter, setFilter] = useState(PREVIEW_FILTER.ALL);

  /*
  | Only the tabs that have something behind them, with their counts read off
  | the summary that the cards on the previous screen were drawn from.
  */
  const tabs = useMemo(
    () =>
      [
        { key: PREVIEW_FILTER.ALL, label: "All", count: summary.total },
        { key: PREVIEW_FILTER.VALID, label: "Will import", count: summary.newRecords },
        { key: PREVIEW_FILTER.WARNINGS, label: "Warnings", count: summary.warnings },
        { key: PREVIEW_FILTER.ERRORS, label: "Errors", count: summary.errors },
        { key: PREVIEW_FILTER.UNMATCHED, label: "Unmatched", count: summary.unmatched },
        { key: PREVIEW_FILTER.DUPLICATES, label: "Duplicates", count: summary.duplicates },
        { key: PREVIEW_FILTER.EXISTING, label: "Already recorded", count: summary.existing },
        { key: PREVIEW_FILTER.CONFLICTS, label: "Leave conflicts", count: summary.conflicts },
      ].filter((tab) => tab.count > 0 || tab.key === PREVIEW_FILTER.ALL),
    [summary]
  );

  const filtered = useMemo(
    () => filterPreviewRows(rows, filter, mode),
    [rows, filter, mode]
  );

  const columns = useMemo(
    () => [
      {
        key: "rowNumber",
        label: "Row",
        sortable: true,
        className: "text-ink-faint",
        render: (row) => row.rowNumber,
      },
      {
        key: "employeeId",
        label: "Employee",
        sortable: true,
        render: (row) => (
          <div className="min-w-0">

            <p className="font-semibold text-ink">
              {row.employee?.name || (
                <span className="text-ink-faint">Not found</span>
              )}
            </p>

            <p className="font-mono text-xs text-ink-subtle">
              {row.source.employeeId || "--"}
            </p>

          </div>
        ),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (row) =>
          row.date ? (
            <span className="whitespace-nowrap">{formatDayLabel(row.date)}</span>
          ) : (
            <span className="font-mono text-xs text-red-600">
              {String(row.source.date || "--")}
            </span>
          ),
      },
      {
        key: "punchIn",
        label: "In",
        align: "center",
        render: (row) =>
          formatImportMinutes(row.punchInMinutes) || (
            <span className="text-ink-faint">--</span>
          ),
      },
      {
        key: "punchOut",
        label: "Out",
        align: "center",
        render: (row) =>
          formatImportMinutes(row.punchOutMinutes) || (
            <span className="text-ink-faint">--</span>
          ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) =>
          row.status ? (
            <AttendanceStatusBadge status={row.status} size="sm" />
          ) : (
            <span className="text-ink-faint">--</span>
          ),
      },
      {
        key: "outcome",
        label: "Outcome",
        render: (row) => <OutcomeBadge outcome={getRowOutcome(row, mode)} />,
      },
      {
        key: "issues",
        label: "Notes",
        className: "max-w-md",
        render: (row) => <RowIssues row={row} />,
      },
    ],
    [mode]
  );

  /*
  | The same row stacked for a phone. Six columns in a 360px viewport is a
  | sideways scroll through every row, which `DataTable` avoids whenever a
  | caller hands it one of these.
  */
  const mobileCard = (row) => (
    <div className="space-y-2">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="truncate font-semibold text-ink">
            {row.employee?.name || row.source.employeeId || "Not found"}
          </p>

          <p className="font-mono text-xs text-ink-subtle">
            Row {row.rowNumber} · {row.date || String(row.source.date || "--")}
          </p>

        </div>

        <OutcomeBadge outcome={getRowOutcome(row, mode)} />

      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">

        {row.status && <AttendanceStatusBadge status={row.status} size="sm" />}

        <span>
          {formatImportMinutes(row.punchInMinutes) || "--"}
          {" → "}
          {formatImportMinutes(row.punchOutMinutes) || "--"}
        </span>

      </div>

      {(row.errors.length > 0 || row.warnings.length > 0) && (
        <RowIssues row={row} />
      )}

    </div>
  );

  return (
    <div className="space-y-6">

      <div className="ui-card overflow-hidden">

        <div className="border-b border-line px-4 py-4 sm:px-6">

          <h2 className="ui-card-title">Preview</h2>

          <p className="ui-card-subtitle">
            Nothing has been written yet. {summary.newRecords.toLocaleString()}{" "}
            of {summary.total.toLocaleString()} rows will be imported.
          </p>

        </div>

        {/* Filters */}
        <div
          role="tablist"
          aria-label="Filter preview rows"
          className="ui-scroll flex gap-2 overflow-x-auto border-b border-line-subtle bg-surface-muted/60 px-4 py-3 sm:px-6"
        >

          {tabs.map((tab) => {

            const active = filter === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.key)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "bg-surface text-ink-muted hover:bg-surface-raised"
                }`}
              >

                {tab.label}

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/25" : "bg-surface-raised text-ink-subtle"
                  }`}
                >
                  {tab.count.toLocaleString()}
                </span>

              </button>
            );

          })}

        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.rowNumber}
          resetKey={`${filter}|${mode}`}
          pageSize={PREVIEW_PAGE_SIZE}
          paginationLabel="rows"
          minWidthClass="min-w-[64rem]"
          mobileCard={mobileCard}
          empty={{
            icon: <FiInbox size={28} />,
            title: "Nothing in this filter",
            message: "Choose another filter to see the rest of the file.",
          }}
        />

      </div>

      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <button type="button" onClick={onBack} className="ui-btn ui-btn-secondary">
          <FiArrowLeft />
          Back
        </button>

        <button
          type="button"
          onClick={onImport}
          disabled={summary.newRecords === 0}
          className="ui-btn ui-btn-primary font-semibold"
        >
          <FiUploadCloud />
          Import {summary.newRecords.toLocaleString()} Records
        </button>

      </div>

    </div>
  );

}

export default ImportPreviewStep;
