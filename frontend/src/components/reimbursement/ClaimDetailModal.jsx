import { useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiHash,
  FiHome,
  FiImage,
  FiMap,
  FiMaximize2,
  FiMessageSquare,
  FiNavigation,
  FiShoppingCart,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  MdOutlineFlight,
  MdOutlineHotel,
  MdOutlineLocalGasStation,
  MdOutlineRestaurant,
} from "react-icons/md";
import {
  formatAmount,
  formatDate,
  formatDateTime,
  getStatusMeta,
} from "../../utils/reimbursement/reimbursementUtils";

const CATEGORY_META = {
  Food: {
    icon: MdOutlineRestaurant,
    tile: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  Travel: {
    icon: MdOutlineFlight,
    tile: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  Stay: {
    icon: MdOutlineHotel,
    tile: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  },
  Fuel: {
    icon: MdOutlineLocalGasStation,
    tile: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

const DEFAULT_CATEGORY_META = {
  icon: FiFileText,
  tile: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
};

const STATUS_ICONS = {
  pending: FiClock,
  approved: FiCheckCircle,
  rejected: FiXCircle,
};

const categoryMetaOf = (category) => CATEGORY_META[category] || DEFAULT_CATEGORY_META;

const detailRows = (expense) => {
  const details = expense.details || {};
  const rows = [];
  switch (expense.category) {
    case "Travel":
      rows.push(["Travel", `${details.travelFrom || "—"} → ${details.travelTo || "—"}`, FiMap]);
      rows.push(["Travel using", details.travelMode || "—", FiNavigation]);
      rows.push(["Ticket date", formatDate(expense.billDate), FiCalendar]);
      break;
    case "Food":
      rows.push(["Bill no", expense.billNo || "—", FiFileText]);
      rows.push(["Bill date", formatDate(expense.billDate), FiCalendar]);
      if (details.orderType === "online") {
        const platform =
          details.foodPlatform === "Other"
            ? details.vendorName || "Other"
            : details.foodPlatform || "—";
        rows.push(["Order type", `Online · ${platform}`, FiShoppingCart]);
      } else if (details.orderType === "offline") {
        rows.push(["Order type", `Offline · ${details.vendorName || "—"}`, FiShoppingCart]);
      }
      break;
    case "Stay":
      rows.push(["Hotel", details.hotelName || "—", FiHome]);
      rows.push(["Bill no", expense.billNo || "—", FiFileText]);
      rows.push(["Bill date", formatDate(expense.billDate), FiCalendar]);
      rows.push([
        "Duration",
        details.stayDays
          ? `${details.stayDays} day${Number(details.stayDays) === 1 ? "" : "s"}`
          : "—",
        FiClock,
      ]);
      break;
    case "Fuel":
      rows.push(["Meter start", details.meterStart || "—", FiHash]);
      rows.push(["Meter end", details.meterEnd || "—", FiHash]);
      rows.push([
        "Distance",
        details.distanceKm ? `${Number(details.distanceKm).toLocaleString("en-IN")} km` : "—",
        FiNavigation,
      ]);
      rows.push([
        "Fuel used",
        details.fuelLitres
          ? `${details.fuelLitres} L @ ${details.kmPerLitre || 40} km/l`
          : "—",
        MdOutlineLocalGasStation,
      ]);
      rows.push([
        "Rate",
        details.fuelRate ? `${formatAmount(details.fuelRate)} / litre` : "—",
        FiTrendingUp,
      ]);
      break;
    default:
      rows.push(["Bill no", expense.billNo || "—", FiFileText]);
      rows.push(["Bill date", formatDate(expense.billDate), FiCalendar]);
  }
  if (expense.note) {
    rows.push([expense.category === "Fuel" ? "Reason" : "Remark", expense.note, FiMessageSquare]);
  }
  return rows;
};

const billImagesOf = (expense) => {
  if (Array.isArray(expense.receiptUrls) && expense.receiptUrls.length) {
    return expense.receiptUrls;
  }
  return expense.receiptUrl ? [expense.receiptUrl] : [];
};

// Every image attached to an expense, labelled, in one carousel.
const imagesOf = (expense) => {
  const billLabel = expense.category === "Travel" ? "Ticket" : "Bill";
  const images = billImagesOf(expense).map((url) => ({ url, label: billLabel }));
  if (expense.details?.meterStartImg) {
    images.push({ url: expense.details.meterStartImg, label: "Start meter" });
  }
  if (expense.details?.meterEndImg) {
    images.push({ url: expense.details.meterEndImg, label: "End meter" });
  }
  return images;
};

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
          <Icon size={18} />
        </span>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function DetailsCard({ expense }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <SectionHeader icon={FiFileText} title="Reimbursement Details" />
      <dl className="mt-4 divide-y divide-line border-t border-line">
        {detailRows(expense).map(([label, value, Icon]) => (
          <div key={label} className="flex items-center gap-4 py-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-ink-subtle">{label}</dt>
              <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ImageCarousel({ images, title }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const current = images[Math.min(index, count - 1)];
  const go = (step) => setIndex((i) => (i + step + count) % count);

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <SectionHeader
        icon={FiImage}
        title={title}
        action={
          current && (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-brand hover:text-brand"
            >
              <FiMaximize2 size={13} />
              View full size
            </a>
          )
        }
      />

      {current ? (
        <>
          <div className="relative mt-4 flex h-72 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-muted">
            <img
              src={current.url}
              alt={`${current.label} ${index + 1}`}
              className="max-h-full max-w-full object-contain p-3"
            />
            <span className="absolute left-3 top-3 rounded-full bg-slate-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              {current.label} · {index + 1}/{count}
            </span>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-muted shadow-sm transition hover:text-brand"
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-muted shadow-sm transition hover:text-brand"
                >
                  <FiChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {count > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              {images.map((image, i) => (
                <button
                  key={`${image.url}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-brand" : "w-2 bg-ink-faint/50 hover:bg-ink-faint"
                    }`}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-muted text-ink-faint">
          <FiImage size={28} />
          <p className="text-sm">No images attached</p>
        </div>
      )}
    </div>
  );
}

function ExpenseBlock({ expense, index, showHeading }) {
  const { icon: Icon, tile } = categoryMetaOf(expense.category);
  return (
    <section className="space-y-3">
      {showHeading && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tile}`}>
              <Icon size={16} />
            </span>
            <p className="text-sm font-semibold text-ink">
              #{index + 1} · {expense.category}
            </p>
          </div>
          <p className="text-sm font-bold text-ink">{formatAmount(expense.amount)}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailsCard expense={expense} />
        <ImageCarousel
          images={imagesOf(expense)}
          title={expense.category === "Travel" ? "Ticket Images" : "Bill Images"}
        />
      </div>
    </section>
  );
}

function ClaimDetailModal({ open, claim, onClose }) {
  if (!open || !claim) return null;
  const meta = getStatusMeta(claim.status);
  const StatusIcon = STATUS_ICONS[String(claim.status || "").toLowerCase()] || FiClock;
  const expenses = claim.expenses || [];
  const isTrip = claim.type === "trip";
  const headerCategory =
    claim.category && claim.category !== "Mixed" ? claim.category : expenses[0]?.category;
  const { icon: HeaderIcon, tile } = isTrip
    ? { icon: FiMap, tile: DEFAULT_CATEGORY_META.tile }
    : categoryMetaOf(headerCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-canvas shadow-2xl">
        {/* Header */}
        <div className="relative flex flex-wrap items-start gap-4 border-b border-line bg-surface px-6 py-5 pr-16">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tile}`}>
            <HeaderIcon size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold text-ink">{claim.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-subtle">
              <span>{claim.employeeName}</span>
              <span className="text-ink-faint">•</span>
              <span>{claim.employeeId}</span>
              <span className="text-ink-faint">•</span>
              <span>Submitted {formatDateTime(claim.submittedAt)}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.pill}`}>
                <StatusIcon size={13} />
                {meta.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
                {isTrip ? <FiUsers size={13} /> : <FiUser size={13} />}
                {isTrip ? "Trip" : "Single"}
              </span>
              {isTrip && (claim.tripFrom || claim.tripTo) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
                  <FiCalendar size={13} />
                  {formatDate(claim.tripFrom)} → {formatDate(claim.tripTo)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-icon-btn absolute right-4 top-4"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {expenses.map((expense, index) => (
            <ExpenseBlock
              key={expense.expenseId || index}
              expense={expense}
              index={index}
              showHeading={expenses.length > 1}
            />
          ))}



          
        </div>

        <div className="border-t border-line bg-surface px-4 py-2">
          <div className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                <FiCreditCard size={20} />
              </span>
              <span className="text-base font-semibold text-ink-subtle">Total</span>
            </div>
            <div className="inline-flex items-center gap-3 self-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="text-xl font-bold">{formatAmount(claim.totalAmount)}</span>
            </div>
          </div>
         <div className="text-center">
           {claim.status === "rejected" && claim.rejectReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-300">Rejection reason</p>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">{claim.rejectReason}</p>
              {claim.decidedBy && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  By {claim.decidedBy} · {formatDateTime(claim.decidedAt)}
                </p>
              )}
            </div>
          )}
          {claim.status === "approved" && claim.decidedBy && (
            <p className="text-xs text-ink-subtle">
              Approved by {claim.decidedBy} · {formatDateTime(claim.decidedAt)}
            </p>
          )}

         </div>
        </div>
      </div>
    </div>
  );
}

export default ClaimDetailModal;
