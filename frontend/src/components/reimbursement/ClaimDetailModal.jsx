import { FiX } from "react-icons/fi";
import {
  formatAmount,
  formatDate,
  formatDateTime,
  getStatusMeta,
} from "../../utils/reimbursement/reimbursementUtils";

const detailRows = (expense) => {
  const details = expense.details || {};
  const rows = [];
  switch (expense.category) {
    case "Travel":
      rows.push(["Travel", `${details.travelFrom || "—"} → ${details.travelTo || "—"}`]);
      rows.push(["Travel using", details.travelMode || "—"]);
      rows.push(["Ticket date", formatDate(expense.billDate)]);
      break;
    case "Food":
      rows.push(["Bill no", expense.billNo || "—"]);
      rows.push(["Bill date", formatDate(expense.billDate)]);
      if (details.orderType === "online") {
        const platform =
          details.foodPlatform === "Other"
            ? details.vendorName || "Other"
            : details.foodPlatform || "—";
        rows.push(["Order type", `Online · ${platform}`]);
      } else if (details.orderType === "offline") {
        rows.push(["Order type", `Offline · ${details.vendorName || "—"}`]);
      }
      break;
    case "Stay":
      rows.push(["Hotel", details.hotelName || "—"]);
      rows.push(["Bill no", expense.billNo || "—"]);
      rows.push(["Bill date", formatDate(expense.billDate)]);
      rows.push([
        "Duration",
        details.stayDays
          ? `${details.stayDays} day${Number(details.stayDays) === 1 ? "" : "s"}`
          : "—",
      ]);
      break;
    case "Fuel":
      rows.push(["Meter start", details.meterStart || "—"]);
      rows.push(["Meter end", details.meterEnd || "—"]);
      rows.push([
        "Distance",
        details.distanceKm ? `${Number(details.distanceKm).toLocaleString("en-IN")} km` : "—",
      ]);
      rows.push([
        "Fuel used",
        details.fuelLitres
          ? `${details.fuelLitres} L @ ${details.kmPerLitre || 40} km/l`
          : "—",
      ]);
      rows.push([
        "Rate",
        details.fuelRate ? `${formatAmount(details.fuelRate)} / litre` : "—",
      ]);
      break;
    default:
      rows.push(["Bill no", expense.billNo || "—"]);
      rows.push(["Bill date", formatDate(expense.billDate)]);
  }
  return rows;
};

function ImageThumbs({ label, urls = [] }) {
  if (!urls.length) return null;
  return (
    <div>
      <p className="ui-eyebrow mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Open full image"
            className="block h-16 w-16 overflow-hidden rounded-lg border border-line bg-surface"
          >
            <img
              src={url}
              alt={`${label} ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

const billImagesOf = (expense) => {
  if (Array.isArray(expense.receiptUrls) && expense.receiptUrls.length) {
    return expense.receiptUrls;
  }
  return expense.receiptUrl ? [expense.receiptUrl] : [];
};

function ClaimDetailModal({ open, claim, onClose }) {
  if (!open || !claim) return null;
  const meta = getStatusMeta(claim.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="ui-card-title truncate">{claim.title}</h2>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}>
                {meta.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {claim.type === "trip" ? "Trip" : "Single"}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-ink-subtle">
              {claim.employeeName} · {claim.employeeId} · Submitted {formatDateTime(claim.submittedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ui-icon-btn">
            <FiX size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-160px)] space-y-4 overflow-y-auto p-6">
          {claim.type === "trip" && (claim.tripFrom || claim.tripTo) && (
            <p className="text-sm text-ink-subtle">
              Trip: {formatDate(claim.tripFrom)} → {formatDate(claim.tripTo)}
            </p>
          )}

          {(claim.expenses || []).map((expense, index) => {
            return (
              <div key={expense.expenseId || index} className="rounded-xl border border-line bg-surface-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      #{index + 1} · {expense.category}
                    </p>
                    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-ink-subtle sm:grid-cols-2">
                      {detailRows(expense).map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3">
                          <dt className="text-ink-faint">{label}</dt>
                          <dd className="text-right font-medium text-ink-muted">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-ink">{formatAmount(expense.amount)}</p>
                </div>
                {expense.note && (
                  <p className="mt-2 text-xs text-ink-subtle">
                    {expense.category === "Fuel" ? "Reason" : "Remark"}: {expense.note}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4">
                  <ImageThumbs
                    label={expense.category === "Travel" ? "Ticket images" : "Bill images"}
                    urls={billImagesOf(expense)}
                  />
                  <ImageThumbs
                    label="Start meter"
                    urls={expense.details?.meterStartImg ? [expense.details.meterStartImg] : []}
                  />
                  <ImageThumbs
                    label="End meter"
                    urls={expense.details?.meterEndImg ? [expense.details.meterEndImg] : []}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
            <span className="text-sm font-semibold text-ink-subtle">Total</span>
            <span className="text-lg font-bold text-ink">{formatAmount(claim.totalAmount)}</span>
          </div>

          {claim.status === "rejected" && claim.rejectReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">Rejection reason</p>
              <p className="mt-1 text-sm text-red-800">{claim.rejectReason}</p>
              {claim.decidedBy && <p className="mt-1 text-xs text-red-600">By {claim.decidedBy} · {formatDateTime(claim.decidedAt)}</p>}
            </div>
          )}
          {claim.status === "approved" && claim.decidedBy && (
            <p className="text-xs text-ink-subtle">
              Approved by {claim.decidedBy} · {formatDateTime(claim.decidedAt)}
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-line px-6 py-4">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary font-semibold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClaimDetailModal;
