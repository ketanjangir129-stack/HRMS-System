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
    <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">

        <p className="text-xs text-ink-subtle sm:text-sm">
          Showing{" "}
          <span className="font-semibold text-ink-muted">
            {range.from}-{range.to}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-ink-muted">
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
            className="cursor-pointer rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring"
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
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
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
                ? "border-brand bg-brand text-white"
                : "border-line text-ink-muted hover:bg-surface-muted"
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronRight size={16} />
        </button>

      </div>

    </div>
  );

}

export default Pagination;
