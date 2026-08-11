import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { PAGE_SIZE_OPTIONS } from "../../../utils/attendance/attendanceConstants";
import { getPageRange } from "../../../utils/attendance/attendanceTable";

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
| Only a window of page buttons is rendered: a full month of records can run
| to dozens of pages and printing every number would overflow the toolbar.
|
| Five numbers still do not fit beside the previous and next arrows on a
| phone, so below `sm` the window narrows again to the current page and its
| two neighbours. The outer numbers are hidden rather than dropped, so the
| row is the same component at every width.
|--------------------------------------------------------------------------
*/

const WINDOW_SIZE = 5;

/* How far from the current page a number stays visible on a phone. */
const MOBILE_REACH = 1;

const getPageWindow = (currentPage, totalPages) => {

  const start = Math.max(
    1,
    Math.min(
      currentPage - Math.floor(WINDOW_SIZE / 2),
      totalPages - WINDOW_SIZE + 1
    )
  );

  const end = Math.min(totalPages, start + WINDOW_SIZE - 1);

  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  );

};

function Pagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label = "records",
}) {

  const range = getPageRange(totalRows, page, pageSize);

  const pages = getPageWindow(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">

        <p className="text-xs text-slate-500 sm:text-sm">
          Showing{" "}
          <span className="font-semibold text-slate-800">
            {range.from}-{range.to}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800">
            {range.total}
          </span>{" "}
          {label}
        </p>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
            aria-label="Rows per page"
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        )}

      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2">

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronLeft size={16} />
        </button>

        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
            className={`h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors ${
              Math.abs(pageNumber - page) <= MOBILE_REACH
                ? "inline-flex"
                : "hidden sm:inline-flex"
            } ${
              pageNumber === page
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronRight size={16} />
        </button>

      </div>

    </div>
  );

}

export default Pagination;
