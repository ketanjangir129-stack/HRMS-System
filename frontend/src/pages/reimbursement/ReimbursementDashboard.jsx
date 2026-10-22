import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import useReimbursements from "../../hooks/useReimbursements";
import ReimbursementSummary from "../../components/reimbursement/ReimbursementSummary";
import ReimbursementTable from "../../components/reimbursement/ReimbursementTable";
import ClaimModal from "../../components/reimbursement/ClaimModal";
import ClaimDetailModal from "../../components/reimbursement/ClaimDetailModal";
import { REIMBURSEMENT_CATEGORIES } from "../../utils/reimbursement/reimbursementConstants";
import {
  filterClaims,
  getClaimSummary,
} from "../../utils/reimbursement/reimbursementUtils";

function ReimbursementDashboard() {
  const { company, currentUser } = useAuth();
  const { canAccessSection } = useRoleAccess();
  const { search, setSearch, setSearchPlaceholder } = useOutletContext();
  const { claims, loading, submitClaim } = useReimbursements();

  const [claimOpen, setClaimOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailClaim, setDetailClaim] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const employeeId = currentUser?.employmentInfo?.employeeId || currentUser?.employeeId || "";
  const ownClaims = useMemo(
    () =>
      claims.filter(
        (claim) =>
          String(claim.employeeId || "").toUpperCase() === String(employeeId || "").toUpperCase()
      ),
    [claims, employeeId]
  );

  useEffect(() => {
    setSearchPlaceholder("Search claims, bill no, employee...");
    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const visibleClaims = useMemo(
    () =>
      filterClaims(ownClaims, {
        search,
        status: statusFilter,
        category: categoryFilter,
        type: typeFilter,
        from: fromDate,
        to: toDate,
      }),
    [ownClaims, search, statusFilter, categoryFilter, typeFilter, fromDate, toDate]
  );

  const summary = useMemo(() => getClaimSummary(ownClaims), [ownClaims]);
  const canAnalytics = canAccessSection("reimbursement.analytics");

  const handleSubmit = async (payload, resetForm) => {
    setSubmitting(true);
    try {
      const result = await submitClaim(payload);
      if (!result?.success) {
        toast.error(result?.message || "Failed to submit claim.");
        return;
      }
      toast.success("Claim submitted. Pending finance approval.");
      resetForm();
      setClaimOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] p-0 sm:p-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reimbursements</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Claim expenses and track pending, approved and rejected reimbursements
            {company?.companyName ? ` · ${company.companyName}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setClaimOpen(true)} className="ui-btn ui-btn-primary font-semibold">
          <FiPlus size={16} /> Claim
        </button>
      </div>

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
        {canAnalytics && <ReimbursementSummary summary={summary} loading={loading} />}

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
          {(statusFilter || categoryFilter || typeFilter || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setCategoryFilter("");
                setTypeFilter("");
                setFromDate("");
                setToDate("");
              }}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <ReimbursementTable
          claims={visibleClaims}
          loading={loading}
          onView={setDetailClaim}
          emptyTitle="No Reimbursements"
          emptyMessage="Use the Claim button to submit a single expense or a trip with multiple expenses."
        />
      </div>

      <ClaimModal open={claimOpen} onClose={() => setClaimOpen(false)} onSubmit={handleSubmit} submitting={submitting} />
      <ClaimDetailModal open={Boolean(detailClaim)} claim={detailClaim} onClose={() => setDetailClaim(null)} />
    </div>
  );
}

export default ReimbursementDashboard;
