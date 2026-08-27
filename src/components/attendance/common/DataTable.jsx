import { useId, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { PAGE_SIZE } from "../../../utils/attendance/attendanceConstants";
import {
  getTotalPages,
  paginate,
  sortRows,
} from "../../../utils/attendance/attendanceTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
} from "./AttendanceState";
import Pagination from "./Pagination";

/*
|--------------------------------------------------------------------------
| Data Table
|--------------------------------------------------------------------------
| The one responsive table used by the attendance module: sorting,
| pagination, and the loading / empty / error states in a single place.
|
| Columns are declared as:
|   { key, label, sortable, align, className, headerClassName, render }
|
| Sorting and pagination are display concerns, so they are handled here.
| Filtering stays with the parent, which also owns the export.
|
| Below `md` a table is the wrong shape for the screen: six columns in a
| 360px viewport is a sideways scroll through every row. A caller that
| passes `mobileCard` gets a stacked card per row on phones instead, and
| the table returns from `md` up. Callers that do not pass it keep the
| scrolling table they already had.
|--------------------------------------------------------------------------
*/

function SortIcon({ active, order }) {

  if (!active) {
    return <FiChevronDown className="text-ink-faint" />;
  }

  return order === "asc" ? (
    <FiChevronUp className="text-brand" />
  ) : (
    <FiChevronDown className="text-brand" />
  );

}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function DataTable({
  columns = [],
  rows = [],
  rowKey,
  loading = false,
  error = "",
  onRetry,
  loadingMessage = "Loading records...",
  skeleton = false,
  empty = {},
  defaultSortBy = "",
  defaultSortOrder = "asc",
  resetKey = "",
  pageSize: initialPageSize = PAGE_SIZE,
  paginationLabel = "records",
  minWidthClass = "min-w-[900px]",
  mobileCard = null,
}) {

  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortFieldId = useId();

  /*
  | Filters live in the parent, which signals a change through `resetKey`. The
  | page is stored together with the key it belongs to, so a filter change
  | falls back to page one without an effect that resets it afterwards.
  */
  const pageKey = `${resetKey}|${pageSize}`;

  const [pageState, setPageState] = useState({ key: pageKey, page: 1 });

  const page = pageState.key === pageKey ? pageState.page : 1;

  const setPage = (nextPage) =>
    setPageState({ key: pageKey, page: nextPage });

  const sorted = useMemo(
    () => sortRows(rows, sortBy, sortOrder),
    [rows, sortBy, sortOrder]
  );

  const totalPages = getTotalPages(sorted.length, pageSize);

  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(
    () => paginate(sorted, currentPage, pageSize),
    [sorted, currentPage, pageSize]
  );

  /*
  | Cards have no column headings to click, so the same sort is offered as a
  | field picker and a direction toggle above them.
  */
  const sortableColumns = useMemo(
    () => columns.filter((column) => column.sortable),
    [columns]
  );

  const handleSort = (column) => {

    if (!column.sortable) return;

    if (sortBy === column.key) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column.key);
    setSortOrder("asc");

  };

  if (loading) {
    return skeleton ? (
      <TableSkeleton />
    ) : (
      <LoadingState message={loadingMessage} />
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (sorted.length === 0) {
    return <EmptyState {...empty} />;
  }

  return (
    <>
      {mobileCard && (
        <div className="md:hidden">

          {sortableColumns.length > 0 && (
            <div className="flex items-center gap-2 border-b border-line-subtle bg-surface-muted/60 px-4 py-3">

              <label
                htmlFor={sortFieldId}
                className="ui-eyebrow shrink-0"
              >
                Sort
              </label>

              <select
                id={sortFieldId}
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setSortOrder("asc");
                }}
                className="min-w-0 flex-1 cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring"
              >
                {!sortBy && <option value="">Default order</option>}

                {sortableColumns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setSortOrder((order) => (order === "asc" ? "desc" : "asc"))
                }
                aria-label={
                  sortOrder === "asc"
                    ? "Sort descending"
                    : "Sort ascending"
                }
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-muted"
              >
                {sortOrder === "asc" ? (
                  <FiChevronUp size={16} />
                ) : (
                  <FiChevronDown size={16} />
                )}
              </button>

            </div>
          )}

          <div className="divide-y divide-line-subtle">

            {paged.map((row, index) => (

              <div
                key={rowKey ? rowKey(row, index) : index}
                className="px-4 py-4 transition-colors active:bg-surface-muted"
              >
                {mobileCard(row, index)}
              </div>

            ))}

          </div>

        </div>
      )}

      <div
        className={`overflow-x-auto ${mobileCard ? "hidden md:block" : ""}`}
      >

        <table className={`w-full border-collapse ${minWidthClass}`}>

          <thead>

            <tr className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">

              {columns.map((column) => (

                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-4 py-3 font-semibold lg:px-6 ${alignClass[column.align] || "text-left"} ${column.sortable ? "cursor-pointer select-none transition-colors hover:text-ink-muted" : ""} ${column.headerClassName || ""}`}
                >

                  <span
                    className={`inline-flex items-center gap-1 ${column.align === "center" ? "justify-center" : ""}`}
                  >

                    {column.label}

                    {column.sortable && (
                      <SortIcon
                        active={sortBy === column.key}
                        order={sortOrder}
                      />
                    )}

                  </span>

                </th>

              ))}

            </tr>

          </thead>

          <tbody className="divide-y divide-line-subtle">

            {paged.map((row, index) => (

              <tr
                key={rowKey ? rowKey(row, index) : index}
                className="group transition-colors hover:bg-surface-muted"
              >

                {columns.map((column) => (

                  <td
                    key={column.key}
                    className={`px-4 py-4 text-sm text-ink-muted lg:px-6 ${alignClass[column.align] || "text-left"} ${column.className || ""}`}
                  >
                    {column.render
                      ? column.render(row, index)
                      : row[column.key] ?? "--"}
                  </td>

                ))}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {sorted.length > pageSize && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label={paginationLabel}
        />
      )}
    </>
  );

}

export default DataTable;
