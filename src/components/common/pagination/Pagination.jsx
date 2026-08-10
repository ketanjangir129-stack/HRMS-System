import {
    FiChevronLeft,
    FiChevronRight,
    FiChevronsLeft,
    FiChevronsRight,
} from "react-icons/fi";

function Pagination({
    currentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,

    pageSize,
    pageSizeOptions = [5,10, 25, 50, 100],

    onPageChange,
    onPageSizeChange,

    showPageSize = true,
    showInfo = true,
}) {

    if (totalItems === 0) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Generate visible page numbers
    |--------------------------------------------------------------------------
    */

    const getPageNumbers = () => {

        const pages = [];

        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {

            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }

            return pages;
        }

        if (currentPage <= 3) {

            return [
                1,
                2,
                3,
                4,
                "...",
                totalPages,
            ];

        }

        if (currentPage >= totalPages - 2) {

            return [
                1,
                "...",
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];

        }

        return [
            1,
            "...",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "...",
            totalPages,
        ];

    };

    const pages = getPageNumbers();

    const buttonBase =
        "flex h-9 min-w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors";

    return (

        <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

            {/* Left side */}

            <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center">

                {showInfo && (

                    <p>
                        Showing{" "}
                        <span className="font-semibold text-slate-700">
                            {startItem}
                        </span>
                        {" "}to{" "}
                        <span className="font-semibold text-slate-700">
                            {endItem}
                        </span>
                        {" "}of{" "}
                        <span className="font-semibold text-slate-700">
                            {totalItems}
                        </span>
                    </p>

                )}

                {showPageSize && (

                    <div className="flex items-center gap-2">

                        <span>
                            Rows:
                        </span>

                        <select
                            value={pageSize}
                            onChange={(e) =>
                                onPageSizeChange(
                                    Number(e.target.value)
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                            {pageSizeOptions.map((size) => (

                                <option
                                    key={size}
                                    value={size}
                                >
                                    {size}
                                </option>

                            ))}

                        </select>

                    </div>

                )}

            </div>

            {/* Right side */}

            <div className="flex items-center justify-center gap-1">

                {/* First */}

                {/* <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={`${buttonBase} ${
                        currentPage === 1
                            ? "cursor-not-allowed border-slate-200 text-slate-300"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label="First page"
                >
                    <FiChevronsLeft size={16} />
                </button> */}

                {/* Previous */}

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(currentPage - 1)
                    }
                    disabled={currentPage === 1}
                    className={`${buttonBase} ${
                        currentPage === 1
                            ? "cursor-not-allowed border-slate-200 text-slate-300"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label="Previous page"
                >
                    <FiChevronLeft size={16} />
                </button>

                {/* Page numbers */}

                <div className="flex items-center gap-1">

                    {pages.map((page, index) => {

                        if (page === "...") {

                            return (

                                <span
                                    key={`ellipsis-${index}`}
                                    className="flex h-9 min-w-9 items-center justify-center text-slate-400"
                                >
                                    ...
                                </span>

                            );

                        }

                        const active =
                            page === currentPage;

                        return (

                            <button
                                key={page}
                                type="button"
                                onClick={() =>
                                    onPageChange(page)
                                }
                                className={`${buttonBase} ${
                                    active
                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {page}
                            </button>

                        );

                    })}

                </div>

                {/* Next */}

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(currentPage + 1)
                    }
                    disabled={
                        currentPage === totalPages
                    }
                    className={`${buttonBase} ${
                        currentPage === totalPages
                            ? "cursor-not-allowed border-slate-200 text-slate-300"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label="Next page"
                >
                    <FiChevronRight size={16} />
                </button>

                {/* Last */}

                {/* <button
                    type="button"
                    onClick={() =>
                        onPageChange(totalPages)
                    }
                    disabled={
                        currentPage === totalPages
                    }
                    className={`${buttonBase} ${
                        currentPage === totalPages
                            ? "cursor-not-allowed border-slate-200 text-slate-300"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label="Last page"
                >
                    <FiChevronsRight size={16} />
                </button> */}

            </div>

        </div>

    );

}

export default Pagination;