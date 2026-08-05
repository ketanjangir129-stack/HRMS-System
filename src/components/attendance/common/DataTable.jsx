import { useMemo, useState } from "react";
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
|--------------------------------------------------------------------------
*/

function SortIcon({ active, order }) {

  if (!active) {
    return <FiChevronDown className="text-slate-300" />;
  }

  return order === "asc" ? (
    <FiChevronUp className="text-blue-600" />
  ) : (
    <FiChevronDown className="text-blue-600" />
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
}) {

  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [pageSize, setPageSize] = useState(initialPageSize);

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
      <div className="overflow-x-auto">

        <table className={`w-full border-collapse ${minWidthClass}`}>

          <thead>

            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

              {columns.map((column) => (

                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-6 py-3 font-semibold ${alignClass[column.align] || "text-left"} ${column.sortable ? "cursor-pointer select-none transition-colors hover:text-slate-700" : ""} ${column.headerClassName || ""}`}
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

          <tbody className="divide-y divide-slate-100">

            {paged.map((row, index) => (

              <tr
                key={rowKey ? rowKey(row, index) : index}
                className="group transition-colors hover:bg-slate-50"
              >

                {columns.map((column) => (

                  <td
                    key={column.key}
                    className={`px-6 py-4 text-sm text-slate-700 ${alignClass[column.align] || "text-left"} ${column.className || ""}`}
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
