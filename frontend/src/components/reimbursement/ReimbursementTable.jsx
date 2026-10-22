import { FiCheck, FiEye, FiX } from "react-icons/fi";
import {
  formatAmount,
  formatDateTime,
  getStatusMeta,
  isPendingClaim,
} from "../../utils/reimbursement/reimbursementUtils";

function ReimbursementTable({
  claims,
  loading = false,
  showEmployee = false,
  canDecide = () => false,
  onView,
  onApprove,
  onReject,
  emptyTitle = "No claims yet",
  emptyMessage = "Claims you submit will appear here.",
}) {
  if (loading) {
    return <div className="ui-card animate-pulse p-6">Loading claims…</div>;
  }

  if (!claims.length) {
    return (
      <div className="ui-card flex flex-col items-center px-6 py-16 text-center">
        <h3 className="text-lg font-semibold text-ink">{emptyTitle}</h3>
        <p className="mt-2 max-w-sm text-sm text-ink-subtle">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="ui-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-4 py-3 font-semibold">Claim</th>
              {showEmployee && <th className="px-4 py-3 font-semibold">Employee</th>}
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Expenses</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const meta = getStatusMeta(claim.status);
              return (
                <tr key={claim.claimId} className="border-b border-line-subtle last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{claim.title}</p>
                    <p className="text-xs text-ink-faint">{claim.claimId}</p>
                  </td>
                  {showEmployee && (
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{claim.employeeName}</p>
                      <p className="text-xs text-ink-faint">{claim.employeeId}</p>
                    </td>
                  )}
                  <td className="px-4 py-3 text-ink-subtle">{claim.type === "trip" ? "Trip" : "Single"}</td>
                  <td className="px-4 py-3 text-ink-subtle">{(claim.expenses || []).length}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatAmount(claim.totalAmount)}</td>
                  <td className="px-4 py-3 text-xs text-ink-subtle">{formatDateTime(claim.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => onView?.(claim)} title="View claim" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600">
                        <FiEye size={15} />
                      </button>
                      {isPendingClaim(claim) && canDecide(claim) && (
                        <>
                          <button type="button" onClick={() => onApprove?.(claim)} title="Approve claim" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600">
                            <FiCheck size={15} />
                          </button>
                          <button type="button" onClick={() => onReject?.(claim)} title="Reject claim" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600">
                            <FiX size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReimbursementTable;
