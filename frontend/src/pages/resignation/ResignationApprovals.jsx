import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { ArrowLeft, Search } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useResignations from "../../hooks/useResignations";
import usePagination from "../../hooks/usePagination";

import Loader from "../../components/common/Loader";
import DepartmentScopeNotice from "../../components/common/DepartmentScopeNotice";
import Pagination from "../../components/common/pagination/Pagination";

import ResignationTable from "../../components/resignation/ResignationTable";
import ResignationStatCards from "../../components/resignation/ResignationStatCards";
import ResignationDetailModal from "../../components/resignation/ResignationDetailModal";
import ResignationDecisionModal from "../../components/resignation/ResignationDecisionModal";

import {
  approveByHr,
  approveByManager,
  rejectByHr,
  rejectByManager,
} from "../../services/resignation/resignationService";

import { getUserName } from "../../utils/user";

import {
  RESIGNATION_STATUS,
  isClosedStatus,
} from "../../utils/resignation/resignationConstants";

import { ROLE } from "../../utils/attendance/attendanceConstants";

import {
  canApproveFinance,
  canHrReview,
  canManagerReview,
  canPrepareFnF,
  canReviewFnF,
  searchResignations,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Approvals
|--------------------------------------------------------------------------
| The desk. Every exit the signed in user may see, in three tabs.
|
| "Needs You" is first and is the default, because it is the only one that
| answers the question somebody opens an approval queue with. A manager and
| an HR user looking at the same company see different rows in it — each sees
| the ones at the stage they own — and that is decided by `isAwaitingUser`,
| the same pure check the service guards each transition with.
|
| A manager is narrowed again to their own departments by `useResignations`,
| and the banner above the table says so. Without it a department of eight
| inside a company of ninety reads as a page that failed to load.
|
| The decisions themselves are taken in modals rather than from the rows. A
| queue whose rows carry Approve and Reject teaches people to decide without
| reading, and a resignation is not a thing to decide without reading.
|--------------------------------------------------------------------------
*/

const TABS = [
  { key: "mine", label: "Needs You" },
  { key: "open", label: "In Progress" },
  { key: "closed", label: "Completed" },
];

function ResignationApprovals() {

  const navigate = useNavigate();

  const { currentUser } = useAuth();

  const {
    resignations,
    awaitingMe,
    summary,
    loading,
    error,
    reload,
    companyCode,
    role,
    employeeId,
    scope,
    canFinanceApprove,
  } = useResignations();

  const [tab, setTab] = useState("mine");

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);

  /* `{ type, resignation }` — which decision modal is open, if any. */
  const [decision, setDecision] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const actor = useMemo(
    () => ({
      employeeId,
      name: getUserName(currentUser) || employeeId,
    }),
    [currentUser, employeeId]
  );

  /*
  | The rows of the chosen tab, searched. Derived rather than held, so a
  | decision taken in a modal is reflected the moment the list reloads.
  */
  const rows = useMemo(() => {

    const byTab =
      tab === "mine"
        ? awaitingMe
        : tab === "closed"
          ? resignations.filter((item) => isClosedStatus(item.status))
          : resignations.filter((item) => !isClosedStatus(item.status));

    return searchResignations(byTab, search);

  }, [tab, awaitingMe, resignations, search]);

  const pagination = usePagination({
    data: rows,
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  /*
  | The word a row offers this reader. It is the same set of checks that
  | decides the buttons in the detail modal, so the label a row promises and
  | the action it opens onto cannot disagree.
  */
  const getActionLabel = (resignation) => {

    if (canManagerReview(resignation, role, scope)) return "Review";

    if (canHrReview(resignation, role)) return "Review";

    if (canPrepareFnF(resignation, role)) return "Settlement";

    if (canReviewFnF(resignation, role)) return "Review Settlement";

    if (canApproveFinance(resignation, canFinanceApprove)) return "Approve";

    if (isChasingEquipment(resignation)) return "Chase Equipment";

    return "View";

  };

  /*
  | An exit HR is waiting on the employee for. It is not one of the `canX`
  | checks because nothing is being decided - but it is the state HR most
  | often needs to act on, and the only useful action (re-sending the form)
  | lives on the settlement screen. So the row goes there rather than to a
  | detail modal with no buttons on it.
  */
  const isChasingEquipment = (resignation) =>
    resignation?.status === RESIGNATION_STATUS.EQUIPMENT_PENDING &&
    (role === ROLE.OWNER || role === ROLE.HR);

  /*
  | Opening a row. The settlement stages are a screen of their own rather than
  | a modal — a worksheet of seven money fields is not something to fill in
  | inside a dialog — so those rows navigate and the rest open the detail.
  */
  const openRow = (resignation) => {

    if (
      canPrepareFnF(resignation, role) ||
      canReviewFnF(resignation, role) ||
      canApproveFinance(resignation, canFinanceApprove) ||
      isChasingEquipment(resignation)
    ) {
      navigate(`/resignation/settlement/${resignation.resignationId}`);
      return;
    }

    setSelected(resignation);

  };

  /* Every decision this page can take, dispatched by the modal's `type`. */
  const runDecision = async ({ note, lastWorkingDay }) => {

    const { type, resignation } = decision;

    setSubmitting(true);

    try {

      const id = resignation.resignationId;

      const result =
        type === "managerApprove"
          ? await approveByManager(companyCode, id, actor, note)
          : type === "managerReject"
            ? await rejectByManager(companyCode, id, actor, note)
            : type === "hrApprove"
              ? await approveByHr(companyCode, id, actor, {
                  lastWorkingDay,
                  remarks: note,
                })
              : await rejectByHr(companyCode, id, actor, note);

      if (!result.success) return result;

      setDecision(null);

      setSelected(null);

      /*
      | HR's approval sends the equipment email, and whether it left is worth
      | saying out loud — that message is what the whole next stage waits on.
      | A failed send is a warning rather than an error: the approval itself
      | stood, and the form can be re-sent from the settlement screen.
      */
      if (type === "hrApprove") {

        if (result.email?.success) {
          toast.success(
            `Approved. ${result.email.message}`
          );
        } else {
          toast.warning(
            `Approved, but the equipment form could not be emailed. ${
              result.email?.message || ""
            }`
          );
        }

      } else {
        toast.success(
          type === "managerApprove"
            ? "Approved and sent to HR."
            : "The resignation has been rejected."
        );
      }

      reload();

      return result;

    } catch (decisionError) {

      console.error("Resignation decision failed:", decisionError);

      return {
        success: false,
        message: "That could not be completed. Please try again.",
      };

    } finally {

      setSubmitting(false);

    }

  };

  /* The buttons in the detail modal's footer, for whatever this reader may
     do with the record that is open. */
  const detailActions = (resignation) => {

    if (!resignation) return null;

    const manager = canManagerReview(resignation, role, scope);

    const hr = canHrReview(resignation, role);

    if (!manager && !hr) return null;

    return (
      <>

        <button
          type="button"
          onClick={() =>
            setDecision({
              type: manager ? "managerReject" : "hrReject",
              resignation,
            })
          }
          className="ui-btn font-semibold border border-red-200 bg-surface text-red-600 hover:bg-red-50"
        >
          Reject
        </button>

        <button
          type="button"
          onClick={() =>
            setDecision({
              type: manager ? "managerApprove" : "hrApprove",
              resignation,
            })
          }
          className="ui-btn font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Approve
        </button>

      </>
    );

  };

  /* The wording of the decision modal, per type. */
  const decisionProps = () => {

    if (!decision) return {};

    const map = {
      managerApprove: {
        title: "Approve Resignation",
        description: "This sends it on to HR.",
        tone: "approve",
        confirmLabel: "Approve & Send to HR",
        noteLabel: "Remarks",
      },
      managerReject: {
        title: "Reject Resignation",
        description: "The employee will be told why.",
        tone: "reject",
        confirmLabel: "Reject Resignation",
        noteLabel: "Reason for Rejection",
        notePlaceholder: "Explain why this resignation is being rejected...",
        noteRequired: true,
      },
      hrApprove: {
        title: "Approve Resignation",
        description:
          "This confirms the last working day and emails the equipment form.",
        tone: "approve",
        confirmLabel: "Approve & Request Equipment",
        noteLabel: "Remarks",
        withLastWorkingDay: true,
      },
      hrReject: {
        title: "Reject Resignation",
        description: "The employee will be told why.",
        tone: "reject",
        confirmLabel: "Reject Resignation",
        noteLabel: "Reason for Rejection",
        notePlaceholder: "Explain why this resignation is being rejected...",
        noteRequired: true,
      },
    };

    return map[decision.type] || {};

  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="ui-card px-6 py-10">
          <Loader text="Loading resignations..." />
        </div>
      </div>
    );
  }

  return (

    <div className="space-y-5 p-2">

      {/* Header */}
      <div className="ui-card flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={() => navigate("/resignation")}
            aria-label="Back"
            className="ui-icon-btn shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">

            <h1 className="text-xl font-bold text-ink">
              Resignation Approvals
            </h1>

            <p className="mt-0.5 text-sm text-ink-subtle">
              Review resignations and move exits along.
            </p>

          </div>

        </div>

        <div className="relative shrink-0 lg:w-72">

          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pagination.resetPagination();
            }}
            placeholder="Search name, ID or department"
            aria-label="Search resignations"
            className="ui-field pl-9"
          />

        </div>

      </div>

      <DepartmentScopeNotice subject="resignations" />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <ResignationStatCards summary={summary} />

      {/* Queue */}
      <div className="ui-card overflow-hidden">

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-3 sm:px-5">

          {TABS.map((item) => {

            const count =
              item.key === "mine"
                ? awaitingMe.length
                : item.key === "closed"
                  ? resignations.filter((row) => isClosedStatus(row.status)).length
                  : resignations.filter((row) => !isClosedStatus(row.status)).length;

            const active = tab === item.key;

            return (

              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  pagination.resetPagination();
                }}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >

                {item.label}

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active
                      ? "bg-brand/10 text-brand"
                      : "bg-surface-muted text-ink-faint"
                  }`}
                >
                  {count}
                </span>

              </button>

            );

          })}

        </div>

        <ResignationTable
          resignations={pagination.paginatedData}
          getActionLabel={getActionLabel}
          onOpen={openRow}
          emptyMessage={
            tab === "mine"
              ? "Nothing is waiting on you right now."
              : tab === "closed"
                ? "No completed exits yet."
                : "No resignations in progress."
          }
        />

        {rows.length > 0 && (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              pageSize={pagination.pageSize}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageChange={pagination.goToPage}
              onPageSizeChange={pagination.changePageSize}
            />
          </div>
        )}

      </div>

      <ResignationDetailModal
        open={Boolean(selected)}
        resignation={selected}
        actions={detailActions(selected)}
        onClose={() => setSelected(null)}
      />

      <ResignationDecisionModal
        open={Boolean(decision)}
        resignation={decision?.resignation}
        submitting={submitting}
        onClose={() => setDecision(null)}
        onConfirm={runDecision}
        {...decisionProps()}
      />

    </div>

  );

}

export default ResignationApprovals;
