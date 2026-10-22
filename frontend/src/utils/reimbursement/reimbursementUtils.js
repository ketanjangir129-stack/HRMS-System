import {
  REIMBURSEMENT_STATUS,
  STATUS_META,
} from "./reimbursementConstants";

// Validation lives next to the category field definitions so the form and the
// submit payload stay aligned.
export { validateExpenseRow } from "./reimbursementFields";

export const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getStatusMeta = (status) =>
  STATUS_META[String(status || "").toLowerCase()] || {
    label: String(status || "—"),
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  };

export const isPendingClaim = (claim) =>
  String(claim?.status || "").toLowerCase() === REIMBURSEMENT_STATUS.PENDING;

// Finance Manager only: Finance department + Finance Manager designation.
// Mirrors backend isFinanceManager — Finance Executives cannot decide.
const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

const departmentOf = (viewer) =>
  viewer?.employmentInfo?.department ?? viewer?.department ?? "";

const designationOf = (viewer) =>
  viewer?.employmentInfo?.designation ?? viewer?.designation ?? "";

export const isFinanceManagerViewer = (viewer) => {
  if (!viewer) return false;
  return (
    normalizeKey(departmentOf(viewer)) === "finance" &&
    normalizeKey(designationOf(viewer)) === "finance manager"
  );
};

export const canDecideClaim = (claim, viewer, isOwner) => {
  if (!isPendingClaim(claim)) return false;
  if (isOwner) return true;
  return isFinanceManagerViewer(viewer);
};

export const getClaimSummary = (claims = []) =>
  claims.reduce(
    (summary, claim) => {
      const amount = Number(claim?.totalAmount) || 0;
      summary.totalClaims += 1;
      summary.totalAmount += amount;
      if (String(claim?.status).toLowerCase() === "pending") {
        summary.pendingClaims += 1;
        summary.pendingAmount += amount;
      } else if (String(claim?.status).toLowerCase() === "approved") {
        summary.approvedClaims += 1;
        summary.approvedAmount += amount;
      } else if (String(claim?.status).toLowerCase() === "rejected") {
        summary.rejectedClaims += 1;
        summary.rejectedAmount += amount;
      }
      return summary;
    },
    {
      totalClaims: 0,
      totalAmount: 0,
      pendingClaims: 0,
      pendingAmount: 0,
      approvedClaims: 0,
      approvedAmount: 0,
      rejectedClaims: 0,
      rejectedAmount: 0,
    }
  );

export const filterClaims = (claims = [], { search = "", status = "", category = "", type = "", from = "", to = "" } = {}) => {
  const query = String(search).trim().toLowerCase();
  return claims.filter((claim) => {
    if (status && String(claim.status).toLowerCase() !== status.toLowerCase()) return false;
    if (type && String(claim.type).toLowerCase() !== type.toLowerCase()) return false;
    if (category) {
      const categories = (claim.expenses || []).map((e) => e.category);
      if (claim.category && claim.category !== "Mixed") categories.push(claim.category);
      if (!categories.includes(category)) return false;
    }
    if (from && String(claim.submittedAt || "") && new Date(claim.submittedAt) < new Date(`${from}T00:00:00`)) return false;
    if (to && String(claim.submittedAt || "") && new Date(claim.submittedAt) > new Date(`${to}T23:59:59`)) return false;
    if (!query) return true;
    const haystack = [
      claim.employeeName,
      claim.employeeId,
      claim.title,
      claim.claimId,
      claim.category,
      ...(claim.expenses || []).flatMap((e) => [
        e.billNo,
        e.category,
        e.note,
        e.details?.travelFrom,
        e.details?.travelTo,
        e.details?.travelMode,
        e.details?.hotelName,
        e.details?.vendorName,
        e.details?.foodPlatform,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
};

export const hasErrors = (errors = {}) => Object.values(errors).some(Boolean);
