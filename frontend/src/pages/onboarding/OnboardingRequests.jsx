import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    FiArrowLeft,
    FiCheckCircle,
    FiChevronRight,
    FiUserCheck,
    FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";

import { getOnboardingRequests } from "../../services/OnboardingService";
import {
    approveOnboardingRequests,
    getApproverId,
    rejectOnboardingRequests,
} from "../../services/ApprovalService";
import useAuth from "../../hooks/useAuth";
import {
    isEmailServiceConfigured,
    sendApprovalEmails,
} from "../../services/email/onboardingEmailService";
import { filterData } from "../../utils/search/filterData";
import Loader from "../../components/common/Loader"
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/common/pagination/Pagination";
import ConfirmApproveModal from "./ConfirmApproveModal";
import RejectModal from "./RejectModal";

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

/*
| What "Approve All" reaches. An invitation that has not come back yet is
| approved on the details already on file, alongside the ones whose form has
| been submitted — both are still open requests waiting on a decision. The
| decided statuses, "Approved" and "Rejected", are not here.
*/
const APPROVABLE_STATUSES = ["Pending Approval", "Invitation Sent"];

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

    // Which bulk modal is open, if any: "approve", "reject" or nothing.
    const [bulkAction, setBulkAction] = useState(null);

    const [bulkRunning, setBulkRunning] = useState(false);

    // Stamped onto every record the batch touches, exactly as the single
    // review screen stamps its own approvals.
    const { currentUser } = useAuth();

    const approvedBy = getApproverId(currentUser);

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

    /*
    |--------------------------------------------------------------------------
    | Approve all / Reject all
    |--------------------------------------------------------------------------
    | Only the requests still waiting on a decision are eligible — one already
    | approved or rejected has been decided and neither button touches it.
    |
    | Approve All takes both open statuses: the submitted forms sitting at
    | "Pending Approval" and the invitations still out at "Invitation Sent",
    | so a whole intake can be cleared in one go. Reject All stays on the
    | submitted forms, since there is nothing yet to reject on an invitation.
    |
    | They also work on what is on screen: with a search term typed, the batch
    | is the eligible requests that match it, which is what the count on the
    | button and the line in the modal both say.
    */
    const approvableRequests = filteredRequests.filter((request) =>
        APPROVABLE_STATUSES.includes(request.status)
    );

    const approvableCount = approvableRequests.length;

    const approvableIds = approvableRequests.map((request) => request.id);

    const pendingRequests = filteredRequests.filter(
        (request) => request.status === "Pending Approval"
    );

    const pendingCount = pendingRequests.length;

    const pendingIds = pendingRequests.map((request) => request.id);

    // The part of the approve batch that has not sent a form back, named on
    // the confirmation so the run is not a surprise.
    const invitedCount = approvableCount - pendingCount;

    const requestWord = (count) => (count === 1 ? "request" : "requests");

    const scopeNote = search
        ? " matching your search"
        : "";

    /*
    | The welcome emails go out on the back of the approvals but are no part
    | of them: one summary toast of their own, and an approval already
    | reported as done stays done whatever the mail server says.
    */
    const notifyApproved = async (approved) => {

        const recipients = approved
            .map((item) => item.employee)
            .filter((employee) => employee?.email);

        if (!recipients.length || !isEmailServiceConfigured()) {
            return;
        }

        try {

            const outcome = await sendApprovalEmails(companyCode, recipients);

            if (!outcome.failed) {
                toast.success(
                    `Approval emailed to ${outcome.sent} ${outcome.sent === 1 ? "employee" : "employees"}.`
                );
                return;
            }

            toast.warning(
                `${outcome.sent} approval ${outcome.sent === 1 ? "email" : "emails"} sent, ${outcome.failed} could not be sent.`
            );

        } catch (error) {

            console.error(error);

            toast.warning(
                "The employees were approved, but the approval emails could not be sent."
            );

        }
    };

    const handleApproveAll = async () => {

        if (!approvableCount || bulkRunning) return;

        setBulkRunning(true);

        try {

            const { approved, failed } = await approveOnboardingRequests(
                companyCode,
                approvableIds,
                approvedBy
            );

            if (approved.length && !failed.length) {

                toast.success(
                    `${approved.length} ${requestWord(approved.length)} approved.`
                );

            } else if (approved.length) {

                toast.warning(
                    `${approved.length} ${requestWord(approved.length)} approved, ${failed.length} could not be approved.`
                );

            } else {

                toast.error("None of the requests could be approved.");

            }

            setBulkAction(null);

            await loadRequests();

            await notifyApproved(approved);

        } catch (error) {

            console.error(error);

            toast.error("Failed to approve the requests.");

        } finally {

            setBulkRunning(false);

        }
    };

    const handleRejectAll = async (remarks) => {

        if (!pendingCount || bulkRunning) return;

        setBulkRunning(true);

        try {

            const { rejected, failed } = await rejectOnboardingRequests(
                companyCode,
                pendingIds,
                remarks,
                approvedBy
            );

            if (rejected.length && !failed.length) {

                toast.success(
                    `${rejected.length} ${requestWord(rejected.length)} rejected.`
                );

            } else if (rejected.length) {

                toast.warning(
                    `${rejected.length} ${requestWord(rejected.length)} rejected, ${failed.length} could not be rejected.`
                );

            } else {

                toast.error("None of the requests could be rejected.");

            }

            setBulkAction(null);

            await loadRequests();

        } catch (error) {

            console.error(error);

            toast.error("Failed to reject the requests.");

        } finally {

            setBulkRunning(false);

        }
    };

    const closeBulkModal = () => {
        if (!bulkRunning) {
            setBulkAction(null);
        }
    };

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

                    {/*
                    | The two batch actions, each shown only while there is
                    | something for it to act on — a dead button over a list of
                    | already decided requests says nothing useful. Reject All
                    | can therefore drop away while Approve All stays, on a list
                    | that is all invitations still out. They stack full width
                    | on a phone and sit inline from `sm` up.
                    */}
                    {!loading && approvableCount > 0 && (

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

                            {pendingCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setBulkAction("reject")}
                                    disabled={bulkRunning}
                                    title={`Reject the ${pendingCount} ${requestWord(pendingCount)} pending approval${scopeNote}`}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <FiXCircle size={16} />
                                    Reject All ({pendingCount})
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setBulkAction("approve")}
                                disabled={bulkRunning}
                                title={`Approve the ${approvableCount} open ${requestWord(approvableCount)}${scopeNote} — pending approval and invitation sent`}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FiCheckCircle size={16} />
                                Approve All ({approvableCount})
                            </button>

                        </div>

                    )}

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

            <ConfirmApproveModal
                open={bulkAction === "approve"}
                loading={bulkRunning}
                title="Approve All Requests"
                message={`${approvableCount} open onboarding ${requestWord(approvableCount)}${scopeNote} will be approved — ${pendingCount} pending approval and ${invitedCount} still at invitation sent.`}
                note={
                    invitedCount > 0
                        ? `Each one becomes an employee record and leaves this list. This cannot be undone. The ${invitedCount} invited ${requestWord(invitedCount)} ${invitedCount === 1 ? "has" : "have"} not submitted a form yet, so ${invitedCount === 1 ? "it is" : "they are"} approved on the details already on file.`
                        : "Each one becomes an employee record and leaves this list. This cannot be undone."
                }
                confirmText={`Approve ${approvableCount}`}
                onConfirm={handleApproveAll}
                onClose={closeBulkModal}
            />

            {/* The same remarks box the single review uses — here the reason is
                written onto every request in the batch. Mounted only while it
                is open, so each run starts with an empty box. */}
            {bulkAction === "reject" && (
                <RejectModal
                    isOpen
                    loading={bulkRunning}
                    title="Reject All Requests"
                    description={`${pendingCount} onboarding ${requestWord(pendingCount)} pending approval${scopeNote} will be rejected with these remarks.`}
                    confirmText={`Reject ${pendingCount}`}
                    onConfirm={handleRejectAll}
                    onClose={closeBulkModal}
                />
            )}

        </div>
    )

}
export default OnboardingRequests;
