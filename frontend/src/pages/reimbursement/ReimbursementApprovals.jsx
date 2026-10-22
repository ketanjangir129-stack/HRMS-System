import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { toast } from "react-toastify";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import useReimbursements from "../../hooks/useReimbursements";
import ReimbursementSummary from "../../components/reimbursement/ReimbursementSummary";
import ReimbursementTable from "../../components/reimbursement/ReimbursementTable";
import ClaimDetailModal from "../../components/reimbursement/ClaimDetailModal";
import RejectClaimModal from "../../components/reimbursement/RejectClaimModal";
import { REIMBURSEMENT_CATEGORIES } from "../../utils/reimbursement/reimbursementConstants";
import {
  canDecideClaim,
  filterClaims,
  getClaimSummary,
  isFinanceManagerViewer,
} from "../../utils/reimbursement/reimbursementUtils";
import { getUserRole } from "../../utils/attendance/attendanceRequestUtils";

function ReimbursementApprovals() {
  const { currentUser } = useAuth();
  const { canAccessSection, isOwner } = useRoleAccess();
  const { search, setSearch, setSearchPlaceholder } = useOutletContext();
  const { claims, loading, approveClaim, rejectClaim } = useReimbursements();

  const [detailClaim, setDetailClaim] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const role = getUserRole(currentUser);
  const isFinanceManager = isFinanceManagerViewer(currentUser);
  const allowed = isOwner || isFinanceManager || canAccessSection("reimbursement.approvals");

  useEffect(() => {
    setSearchPlaceholder("Search employee, claim, bill no...");
    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const visibleClaims = useMemo(
    () =>
      filterClaims(claims, {
        search,
        status: statusFilter,
        category: categoryFilter,
        type: typeFilter,
        from: fromDate,
        to: toDate,
      }),
    [claims, search, statusFilter, categoryFilter, typeFilter, fromDate, toDate]
  );

  const summary = useMemo(() => getClaimSummary(claims), [claims]);
  const activeDetail = useMemo(
    () => (detailClaim ? claims.find((c) => c.claimId === detailClaim.claimId) || detailClaim : null),
    [detailClaim, claims]
  );

  const canDecide = (claim) => canDecideClaim(claim, currentUser, isOwner);

  const handleApprove = async (claim) => {
    setApprovingId(claim.claimId);
    try {
      const result = await approveClaim(claim);
      if (!result?.success) {
        toast.error(result?.message || "Failed to approve claim.");
        return;
      }
      toast.success("Claim approved.");
      setDetailClaim(null);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const result = await rejectClaim(rejectTarget, reason);
      if (!result?.success) {
        toast.error(result?.message || "Failed to reject claim.");
        return;
      }
      toast.success("Claim rejected.");
      setRejectTarget(null);
      setDetailClaim(null);
    } finally {
      setRejecting(false);
    }
  };

  if (!allowed && !loading) {
    return (
      <div className="mx-auto max-w-[1600px] p-0 sm:p-2">
        <h1 className="text-2xl font-bold text-ink">Reimbursement Approvals</h1>
        <div className="ui-card mt-6 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiLock size={28} />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-ink">Finance Manager access only</h3>
          <p className="mt-2 max-w-sm text-sm text-ink-subtle">
            Only members of the Finance department with the Finance Manager designation
            {role ? ` (your role: ${role})` : ""} can review and decide reimbursement claims.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-0 sm:p-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reimbursement Approvals</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            {summary.pendingClaims > 0
              ? `${summary.pendingClaims} claim${summary.pendingClaims !== 1 ? "s" : ""} awaiting your review`
              : "No claims awaiting review"}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
        <ReimbursementSummary summary={summary} loading={loading} />

        <div className="ui-card flex flex-wrap gap-3 p-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted outline-none focus:border-brand" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted outline-none focus:border-brand" aria-label="Filter by category">
            <option value="">All categories</option>
            {REIMBURSEMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted outline-none focus:border-brand" aria-label="Filter by type">
            <option value="">Single + Trip</option>
            <option value="single">Single</option>
            <option value="trip">Trip</option>
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted outline-none focus:border-brand" aria-label="From date" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted outline-none focus:border-brand" aria-label="To date" />
        </div>

        <ReimbursementTable
          claims={visibleClaims}
          loading={loading || Boolean(approvingId)}
          showEmployee
          canDecide={canDecide}
          onView={setDetailClaim}
          onApprove={handleApprove}
          onReject={setRejectTarget}
          emptyTitle="No Claims"
          emptyMessage="Submitted reimbursement claims from all employees will appear here."
        />
      </div>

      <ClaimDetailModal open={Boolean(activeDetail)} claim={activeDetail} onClose={() => setDetailClaim(null)} />
      <RejectClaimModal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectTarget?.employeeName}
        claimTitle={rejectTarget?.title}
      />
    </div>
  );
}

export default ReimbursementApprovals;
