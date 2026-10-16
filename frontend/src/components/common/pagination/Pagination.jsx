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
| = 5. Ye har page par same rehta hai, isliye 3 se 4 par jaate waqt bar apni
| jagah se hilti nahi.
|
| Shuruaat mein bar aise dikhti hai:  1  2  3  …  201
| Beech ke kisi page par aise:        1  …  87  …  201
*/

const BOUNDARY_COUNT = 1;

// 0 = current page ke padosi nahi dikhte, sirf wahi page dikhta hai jis par
// hum hain. Isse ladder chhoti rehti hai aur "kaunse page par hain" saaf
// padhne mein aata hai.
const SIBLING_COUNT = 0;

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

        <div className="flex flex-col gap-4 border-t border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

            {/* Left side */}

            <div className="flex flex-col gap-3 text-sm text-ink-subtle sm:flex-row sm:items-center">

                {showInfo && (

                    <p>
                        Showing{" "}
                        <span className="font-semibold text-ink">
                            {startItem}
                        </span>
                        {" "}to{" "}
                        <span className="font-semibold text-ink">
                            {endItem}
                        </span>
                        {" "}of{" "}
                        <span className="font-semibold text-ink">
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
                            aria-label="Rows per page"
                            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-3 focus:ring-brand-ring"
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
                            ? "border-line text-ink-faint"
                            : "border-line text-ink-muted hover:bg-surface-muted"
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
                                    className="flex h-9 min-w-9 items-center justify-center text-ink-faint"
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
                                        ? "border-brand bg-brand text-white shadow-sm"
                                        : "border-line text-ink-muted hover:bg-surface-muted"
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
                            ? "border-line text-ink-faint"
                            : "border-line text-ink-muted hover:bg-surface-muted"
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