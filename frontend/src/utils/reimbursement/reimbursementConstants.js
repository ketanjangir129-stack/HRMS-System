export const REIMBURSEMENT_CATEGORIES = [
  "Travel",
  "Food",
  "Stay",
  "Fuel",
  "Medical",
  "Other",
];

export const REIMBURSEMENT_TYPES = [
  { key: "single", label: "Single", description: "One expense, one category" },
  { key: "trip", label: "Trip", description: "Multiple expenses in one trip" },
];

export const REIMBURSEMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const STATUS_META = {
  pending: { label: "Pending", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", pill: "bg-red-50 text-red-700 border-red-200" },
};

export const MAX_TRIP_EXPENSES = 20;
