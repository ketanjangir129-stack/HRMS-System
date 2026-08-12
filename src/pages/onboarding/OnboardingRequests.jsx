import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FiArrowLeft, FiChevronRight, FiUserCheck } from "react-icons/fi";

import { getOnboardingRequests } from "../../services/OnboardingService";
import { filterData } from "../../utils/search/filterData";
import Loader from "../../components/common/Loader"
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/common/pagination/Pagination";

/*
|--------------------------------------------------------------------------
| Onboarding Requests
|--------------------------------------------------------------------------
| Every onboarding request raised for the company, with the review action.
|
| Two views over one list: below `md` the rows render as cards, at `md` and
| up as the table — the same array, the same page, the same handler, only
| the markup differs. This is the split the employees, payroll and holiday
| tables already use.
|--------------------------------------------------------------------------
*/

// The initials keep a half filled request reading as a person.
const getInitials = (value = "") =>
    String(value)
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

function OnboardingRequests() {

    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    // The search box lives in the navbar; the layout hands it down here.
    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const [requests, setRequests] = useState([]);

    const [filteredRequests, setFilteredRequests] = useState([]);

    const [loading, setLoading] = useState(true);

    const loadRequests = async () => {

        setLoading(true);

        try {

            const data =
                await getOnboardingRequests(companyCode);

            setRequests(data);

            setFilteredRequests(data);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            setLoading(false);

        }

    };
    // console.log(filteredRequests)
    const getStatusStyle = (status) => {
        switch (status) {

            case "Invitation Sent":
                return "bg-blue-50 text-blue-700";

            case "Pending Approval":
                return "bg-amber-50 text-amber-700";

            case "Approved":
                return "bg-emerald-50 text-emerald-700";

            case "Rejected":
                return "bg-rose-50 text-rose-700";

            default:
                return "bg-slate-100 text-slate-600";
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    // The navbar box is shared, so the page names it on arrival and hands it
    // back — placeholder and typed term both — when you leave.
    useEffect(() => {

        setSearchPlaceholder("Search onboarding requests...");

        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };

    }, [setSearch, setSearchPlaceholder]);

    // The same fields the rows show: the request id that fills the Employee ID
    // column, the name, and the two columns that fold into the card line
    // below `lg`.
    useEffect(() => {
        setFilteredRequests(
            filterData(
                requests,
                search,
                [
                    "id",
                    "employmentInfo.name",
                    "employmentInfo.department",
                    "employmentInfo.designation",
                    "status",
                ]
            )
        );
    }, [search, requests]);

    /*
    | The shared pagination hook and bar, same as the employees directory —
    | the page slices what is already loaded and filtered, nothing refetches.
    */
    const {
        paginatedData: paginatedRequests,
        currentPage,
        totalPages,
        totalItems,
        startItem,
        endItem,
        pageSize,
        goToPage,
        changePageSize,
        resetPagination,
    } = usePagination({
        data: filteredRequests,
        initialPageSize: 5,
    });

    // A narrowed list can be shorter than the page you were on.
    useEffect(() => {
        resetPagination();
    }, [search]);

    const placeholder = <span className="text-slate-300">—</span>;

    const statusPill =
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold";

    return (
        <div className="p-0 space-y-4 sm:p-2 sm:space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                {/* Back button, icon and title share one row at every width.
                    Below `sm` the two squares and the heading step down a size
                    so all three fit without the title wrapping mid-phrase. */}
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">

                    <button
                        type="button"
                        onClick={() => navigate("/OnboardDashboard")}
                        title="Go back"
                        aria-label="Go back"
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:h-12 sm:w-12"
                    >
                        <FiArrowLeft size={18} />
                    </button>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-base text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
                        <FiUserCheck />
                    </div>

                    <div className="min-w-0">

                        <h1 className="text-lg font-bold text-slate-900 max-sm:leading-tight sm:text-2xl">
                            Onboarding Requests
                        </h1>

                        <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                            {search
                                ? `${filteredRequests.length} of ${requests.length} requests`
                                : `${requests.length} total request${requests.length === 1 ? "" : "s"}`}
                        </p>

                    </div>

                </div>

            </div>

            {/* Requests */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                            Requests List
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Every onboarding request and where it currently stands.
                        </p>

                    </div>

                </div>

                {loading ? (

                    <div className="px-4 py-10 sm:px-6">
                        <Loader text="Loading onboarding requests..." />
                    </div>

                ) : !requests.length ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <FiUserCheck size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                            No Onboarding Requests
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-slate-500">
                            No onboarding requests available.
                        </p>

                    </div>

                ) : filteredRequests.length === 0 ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <FiUserCheck size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                            No Matches Found
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-slate-500">
                            No matching records found.
                        </p>

                    </div>

                ) : (

                    <>

                        {/*
                        | Phone view. The table needs roughly 700px before it
                        | stops being a sideways scroll, so below `md` the rows
                        | render as cards and the page scrolls vertically only.
                        */}
                        {/* Tinted behind the cards so the white cards read as
                            separate rows rather than one flat panel. */}
                        <div className="space-y-3 bg-slate-50/70 p-4 md:hidden">

                            {paginatedRequests.map((request) => (

                                <button
                                    key={request.id}
                                    type="button"
                                    onClick={() =>
                                        navigate(`/onboarding/${request.id}`)
                                    }
                                    aria-label={`Review ${request.employmentInfo.name || request.id}`}
                                    className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:bg-slate-50"
                                >

                                    {/* Spans rather than divs and paragraphs: a
                                        button may only hold phrasing content. */}
                                    <span className="flex items-start gap-3">

                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                                            {getInitials(request.employmentInfo.name || request.id) || "--"}
                                        </span>

                                        {/* `min-w-0` is what lets the long lines
                                            truncate instead of pushing the status
                                            pill off the card. */}
                                        <span className="block min-w-0 flex-1">

                                            <span className="flex items-start justify-between gap-2">

                                                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                                                    {request.employmentInfo.name || placeholder}
                                                </span>

                                                <span className={`${statusPill} px-2.5 py-1 text-[11px] ${getStatusStyle(request.status)}`}>
                                                    {request.status}
                                                </span>

                                            </span>

                                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                                                {request.id}
                                            </span>

                                            <span className="mt-0.5 block truncate text-xs text-slate-400">
                                                {[request.employmentInfo.department, request.employmentInfo.designation]
                                                    .filter(Boolean)
                                                    .join(" · ") || "--"}
                                            </span>

                                        </span>

                                    </span>

                                </button>

                            ))}

                        </div>

                        {/*
                        | Tablet and desktop. `overscroll-x-contain` keeps a
                        | sideways swipe on the table from dragging the page
                        | behind it on touch screens.
                        */}
                        <div className="hidden overflow-x-auto overscroll-x-contain md:block">

                            <table className="w-full min-w-[700px] border-collapse lg:min-w-[820px]">

                                <thead>

                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                        {/* Everything reads down a left edge except Action,
                                            which stays centred over its button. */}
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee</th>
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee ID</th>
                                        <th className="hidden px-4 py-3 text-left font-semibold sm:px-6 lg:table-cell">Department</th>
                                        <th className="hidden px-4 py-3 text-left font-semibold sm:px-6 lg:table-cell">Designation</th>
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Status</th>
                                        <th className="px-4 py-3 text-center font-semibold sm:px-6">Action</th>

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100">

                                    {paginatedRequests.map((request) => (

                                        <tr
                                            key={request.id}
                                            className="group transition-colors hover:bg-slate-50"
                                        >

                                            <td className="px-4 py-4 text-left text-sm text-slate-700 sm:px-6">

                                                {/* Every avatar starts at the same offset, so the
                                                    column reads as one straight edge and the name
                                                    still truncates instead of wrapping. */}
                                                <div className="flex min-w-0 items-center gap-3 text-left">

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                                        {getInitials(request.employmentInfo.name || request.id) || "--"}
                                                    </div>

                                                    <div className="min-w-0">

                                                        <p className="truncate font-semibold text-slate-800">
                                                            {request.employmentInfo.name || placeholder}
                                                        </p>

                                                        {/*
                                                        | The columns hidden at this width, folded back
                                                        | in. The line disappears at exactly the
                                                        | breakpoint where its own columns appear, so
                                                        | nothing is shown twice.
                                                        */}
                                                        <p className="mt-0.5 truncate text-xs text-slate-400 lg:hidden">
                                                            {[request.employmentInfo.department, request.employmentInfo.designation]
                                                                .filter(Boolean)
                                                                .join(" · ") || "--"}
                                                        </p>

                                                    </div>

                                                </div>

                                            </td>

                                            <td className="px-4 py-4 text-left text-sm font-semibold text-slate-700 sm:px-6">
                                                {request.id}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-slate-700 sm:px-6 lg:table-cell">
                                                {request.employmentInfo.department ? (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                        {request.employmentInfo.department}
                                                    </span>
                                                ) : (
                                                    placeholder
                                                )}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-slate-700 sm:px-6 lg:table-cell">
                                                {request.employmentInfo.designation || placeholder}
                                            </td>

                                            <td className="px-4 py-4 text-left text-sm text-slate-700 sm:px-6">
                                                <span className={`${statusPill} px-3 py-1 text-xs ${getStatusStyle(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-center sm:px-6">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(`/onboarding/${request.id}`)
                                                    }
                                                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                                >
                                                    Review
                                                    <FiChevronRight size={16} />
                                                </button>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                        {/* Pagination sits outside the scrollport, otherwise it
                            slides sideways with the table instead of staying put. */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            startItem={startItem}
                            endItem={endItem}
                            pageSize={pageSize}
                            onPageChange={goToPage}
                            onPageSizeChange={changePageSize}
                        />

                    </>

                )}

            </div>

        </div>
    )

}
export default OnboardingRequests;
