import { useEffect, useMemo, useState } from "react";

function usePagination({
    data = [],
    initialPage = 1,
    initialPageSize = 5,
    pageSizeOptions = [10, 25, 50, 100],
}) {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const totalItems = data.length;
    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / pageSize)
    );
    /*
    |--------------------------------------------------------------------------
    | Keep current page valid
    |--------------------------------------------------------------------------
    */
    useEffect(() => {

        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }

    }, [currentPage, totalPages]);

    /*
    |--------------------------------------------------------------------------
    | Reset page when page size changes
    |--------------------------------------------------------------------------
    */

    const changePageSize = (size) => {

        const newSize = Number(size);

        setPageSize(newSize);
        setCurrentPage(1);

    };

    /*
    |--------------------------------------------------------------------------
    | Page navigation
    |--------------------------------------------------------------------------
    */

    const goToPage = (page) => {

        const nextPage = Math.min(
            Math.max(1, Number(page)),
            totalPages
        );

        setCurrentPage(nextPage);

    };

    const goToFirstPage = () => {
        setCurrentPage(1);
    };

    const goToLastPage = () => {
        setCurrentPage(totalPages);
    };

    const goToNextPage = () => {

        setCurrentPage((prev) =>
            Math.min(prev + 1, totalPages)
        );

    };

    const goToPreviousPage = () => {

        setCurrentPage((prev) =>
            Math.max(prev - 1, 1)
        );

    };

    /*
    |--------------------------------------------------------------------------
    | Paginated data
    |--------------------------------------------------------------------------
    */

    const paginatedData = useMemo(() => {

        const startIndex =
            (currentPage - 1) * pageSize;

        const endIndex =
            startIndex + pageSize;

        return data.slice(startIndex, endIndex);

    }, [
        data,
        currentPage,
        pageSize,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Display information
    |--------------------------------------------------------------------------
    */

    const startItem =
        totalItems === 0
            ? 0
            : (currentPage - 1) * pageSize + 1;

    const endItem =
        totalItems === 0
            ? 0
            : Math.min(
                currentPage * pageSize,
                totalItems
            );

    /*
    |--------------------------------------------------------------------------
    | Reset pagination
    |--------------------------------------------------------------------------
    */

    const resetPagination = () => {

        setCurrentPage(1);

    };

    return {

        // Data
        paginatedData,

        // Pagination state
        currentPage,
        pageSize,
        totalPages,
        totalItems,

        // Display
        startItem,
        endItem,

        // Options
        pageSizeOptions,

        // Navigation
        goToPage,
        goToFirstPage,
        goToLastPage,
        goToNextPage,
        goToPreviousPage,

        // Page size
        changePageSize,

        // Reset
        resetPagination,

        // States
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
    };
}

export default usePagination;