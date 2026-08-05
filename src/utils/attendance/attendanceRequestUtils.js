/*
|--------------------------------------------------------------------------
| Attendance Request Utilities
|--------------------------------------------------------------------------
| Pure helper functions for filtering, sorting, paginating and formatting
| attendance requests. Kept free of Firebase logic so they can be reused
| across components and hooks.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Request Type Options
|--------------------------------------------------------------------------
*/

export const REQUEST_TYPES = [
  { value: "Late Check-in", label: "Late Check-in" },
  { value: "Missed Check-out", label: "Missed Check-out" },
  { value: "Wrong Attendance", label: "Wrong Attendance" },
  { value: "Leave Correction", label: "Leave Correction" },
  { value: "Other", label: "Other" },
];

/*
|--------------------------------------------------------------------------
| Status Badge Styles
|--------------------------------------------------------------------------
*/

export const STATUS_BADGES = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-red-50 text-red-700 ring-red-200",
};

export const STATUS_DOTS = {
  Pending: "bg-amber-500",
  Approved: "bg-emerald-500",
  Rejected: "bg-red-500",
};

/*
|--------------------------------------------------------------------------
| Date & Time Formatting
|--------------------------------------------------------------------------
*/

export const formatDate = (date) => {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timestamp) => {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/*
|--------------------------------------------------------------------------
| Request Filtering
|--------------------------------------------------------------------------
*/

export const filterRequests = (requests, { search = "", status = "", type = "" }) => {
  const keyword = search.trim().toLowerCase();

  return requests.filter((request) => {
    const matchesSearch =
      !keyword ||
      request.employeeName?.toLowerCase().includes(keyword) ||
      request.employeeId?.toLowerCase().includes(keyword) ||
      request.requestId?.toLowerCase().includes(keyword) ||
      request.type?.toLowerCase().includes(keyword);

    const matchesStatus = !status || request.status === status;
    const matchesType = !type || request.type === type;

    return matchesSearch && matchesStatus && matchesType;
  });
};

/*
|--------------------------------------------------------------------------
| Request Sorting
|--------------------------------------------------------------------------
*/

export const sortRequests = (requests, sortBy = "requestedAt", sortOrder = "desc") => {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...requests].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle nested or missing values gracefully
    if (sortBy === "employeeName") {
      aValue = a[sortBy] || "";
      bValue = b[sortBy] || "";
      return String(aValue).localeCompare(String(bValue)) * direction;
    }

    if (aValue == null) aValue = 0;
    if (bValue == null) bValue = 0;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * direction;
    }

    return String(aValue).localeCompare(String(bValue)) * direction;
  });
};

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

export const paginateRequests = (requests, page = 1, pageSize = 8) => {
  const start = (page - 1) * pageSize;
  return requests.slice(start, start + pageSize);
};

export const getTotalPages = (total, pageSize = 8) => {
  return Math.max(1, Math.ceil(total / pageSize));
};

/*
|--------------------------------------------------------------------------
| Request Summary
|--------------------------------------------------------------------------
*/

export const getRequestSummary = (requests = []) => {
  return {
    total: requests.length,
    pending: requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved").length,
    rejected: requests.filter((r) => r.status === "Rejected").length,
  };
};

/*
|--------------------------------------------------------------------------
| Initial Request Form
|--------------------------------------------------------------------------
*/

export const getInitialRequestForm = (employee = {}) => ({
  employeeId: employee?.employmentInfo?.employeeId || "",
  employeeName: employee?.personalInfo?.name || "",
  department: employee?.employmentInfo?.department || "",
  designation: employee?.employmentInfo?.designation || "",
  type: "",
  date: new Date().toISOString().split("T")[0],
  requestedCheckIn: "",
  requestedCheckOut: "",
  reason: "",
});
