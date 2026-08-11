import {
    FiChevronLeft,
    FiChevronRight,
    FiChevronsLeft,
    FiChevronsRight,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Window Shape
|--------------------------------------------------------------------------
| Kitne page numbers dikhte hain, ye in do se decide hota hai:
|
|   boundary — dono kinaron par hamesha dikhne wale pages (pehla aur aakhri)
|   sibling  — current page ke aas paas kitne padosi dikhein
|
| Total slots = boundary*2 + sibling*2 + 3 (current + do ellipsis ki jagah)
| = 7. Ye har page par same rehta hai, isliye 3 se 4 par jaate waqt bar apni
| jagah se hilti nahi.
*/

const BOUNDARY_COUNT = 1;

const SIBLING_COUNT = 1;

// start se end tak ke numbers, dono included. Ulta range khaali aata hai.
const range = (start, end) =>
    end < start
        ? []
        : Array.from(
              { length: end - start + 1 },
              (_, index) => start + index
          );

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

    /*
    |--------------------------------------------------------------------------
    | Hide until there is something to paginate
    |--------------------------------------------------------------------------
    | Khaali list par, aur jab tak saari rows ek hi page mein aa jaati hain,
    | ye bar chhupi rehti hai. Pehli baar tabhi dikhti hai jab itne
    | employees/tasks add ho jaayein ki doosra page ban jaaye.
    */

    if (totalItems === 0 || totalPages <= 1) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Generate visible page numbers
    |--------------------------------------------------------------------------
    */

    const getPageNumbers = () => {

        /*
        | Itne pages hain hi nahi ki kuch chhupana pade — sab dikha do.
        */

        const maxSlots =
            BOUNDARY_COUNT * 2 + SIBLING_COUNT * 2 + 3;

        if (totalPages <= maxSlots) {
            return range(1, totalPages);
        }

        const startPages = range(1, BOUNDARY_COUNT);

        const endPages = range(
            totalPages - BOUNDARY_COUNT + 1,
            totalPages
        );

        /*
        | Current page ke aas paas ki window. Dono taraf clamp ki hui hai:
        |
        |  - kinaron par window andar ki taraf khisak jaati hai, taki page 1
        |    par bhi utne hi numbers dikhein jitne beech mein
        |  - boundary pages ko cross nahi karti, warna wahi number do baar
        |    render hota
        */

        const siblingsStart = Math.max(
            Math.min(
                currentPage - SIBLING_COUNT,
                totalPages - BOUNDARY_COUNT - SIBLING_COUNT * 2 - 1
            ),
            BOUNDARY_COUNT + 2
        );

        const siblingsEnd = Math.min(
            Math.max(
                currentPage + SIBLING_COUNT,
                BOUNDARY_COUNT + SIBLING_COUNT * 2 + 2
            ),
            totalPages - BOUNDARY_COUNT - 1
        );

        /*
        | Ellipsis tabhi jab uske peeche do ya usse zyada pages chhupe hon.
        | Ek hi page bacha ho to "..." ki jagah wahi number rakh dete hain —
        | teen dots pe click nahi hota, number pe hota hai.
        */

        const startGap =
            siblingsStart > BOUNDARY_COUNT + 2
                ? ["..."]
                : range(BOUNDARY_COUNT + 1, siblingsStart - 1);

        const endGap =
            siblingsEnd < totalPages - BOUNDARY_COUNT - 1
                ? ["..."]
                : range(siblingsEnd + 1, totalPages - BOUNDARY_COUNT);

        return [
            ...startPages,
            ...startGap,
            ...range(siblingsStart, siblingsEnd),
            ...endGap,
            ...endPages,
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
                            ? " border-slate-200 text-slate-300"
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
                                aria-current={
                                    active ? "page" : undefined
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
                            ? "border-slate-200 text-slate-300"
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