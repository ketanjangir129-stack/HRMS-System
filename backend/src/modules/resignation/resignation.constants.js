// This file holds all the status flow for the resignation.

const RESIGNATION_STATUS = Object.freeze({
  MANAGER_PENDING: "MANAGER_PENDING",
  MANAGER_REJECTED: "MANAGER_REJECTED",

  HR_PENDING: "HR_PENDING",
  HR_REJECTED: "HR_REJECTED",

  EQUIPMENT_PENDING: "EQUIPMENT_PENDING",

  FNF_PENDING: "FNF_PENDING",
  FNF_REVIEW: "FNF_REVIEW",

  FINANCE_PENDING: "FINANCE_PENDING",

  EXITED: "EXITED",
});

const RESIGNATION_ACTION = Object.freeze({
  CREATED: "CREATED",

  MANAGER_APPROVED: "MANAGER_APPROVED",
  MANAGER_REJECTED: "MANAGER_REJECTED",

  HR_APPROVED: "HR_APPROVED",
  HR_REJECTED: "HR_REJECTED",

  EQUIPMENT_SUBMITTED: "EQUIPMENT_SUBMITTED",

  FNF_SAVED: "FNF_SAVED",
  FNF_SUBMITTED: "FNF_SUBMITTED",
  FNF_REVIEWED: "FNF_REVIEWED",
  FNF_RETURNED: "FNF_RETURNED",

  FINANCE_APPROVED: "FINANCE_APPROVED",

  EXIT_COMPLETED: "EXIT_COMPLETED",

  NOC_SENT: "NOC_SENT",
});

/*
 * Records written before this API existed were saved by the frontend with
 * display labels as their status. Map them onto the codes above so those
 * records can still move through the flow.
 * Same labels as frontend/src/utils/resignation/resignationConstants.js.
 */
const LEGACY_STATUS_LABELS = Object.freeze({
  "Manager Approval Pending": RESIGNATION_STATUS.MANAGER_PENDING,
  "Rejected by Manager": RESIGNATION_STATUS.MANAGER_REJECTED,
  "HR Approval Pending": RESIGNATION_STATUS.HR_PENDING,
  "Rejected by HR": RESIGNATION_STATUS.HR_REJECTED,
  "Equipment Submission Pending": RESIGNATION_STATUS.EQUIPMENT_PENDING,
  "Full & Final Pending": RESIGNATION_STATUS.FNF_PENDING,
  "Full & Final Under Review": RESIGNATION_STATUS.FNF_REVIEW,
  "Finance Approval Pending": RESIGNATION_STATUS.FINANCE_PENDING,
  "Exited": RESIGNATION_STATUS.EXITED,
});

const normalizeStatus = (status) =>
  LEGACY_STATUS_LABELS[status] || status;

module.exports = {
  RESIGNATION_STATUS,
  RESIGNATION_ACTION,
  normalizeStatus,
};