import { useEffect, useMemo, useState } from "react";
import {
  FiFilter,
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  REQUEST_TYPES,
  STATUS_BADGES,
  STATUS_DOTS,
  filterRequests,
  sortRequests,
  paginateRequests,
  getTotalPages,
  formatDate,
  formatTime,
} from "../../../utils/attendance/attendanceRequestUtils";
import AttendanceRequestSkeleton from "./AttendanceRequestSkeleton";

const PAGE_SIZE = 8;

const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

function AttendanceRequestList({
  requests = [],
  loading,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onCreate,
  pendingCount = 0,
  headerSearch = "",
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("requestedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [headerSearch, statusFilter, typeFilter]);

  const filtered = useMemo(
    () =>
      filterRequests(requests, {
        search: headerSearch,
        status: statusFilter,
        type: typeFilter,
      }),
    [requests, headerSearch, statusFilter, typeFilter]
  );

  const sorted = useMemo(
    () => sortRequests(filtered, sortBy, sortOrder),
    [filtered, sortBy, sortOrder]
  );

  const totalPages = getTotalPages(sorted.length, PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => paginateRequests(sorted, currentPage, PAGE_SIZE),
    [sorted, currentPage]
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <FiChevronDown className="text-slate-300" />;
    }
    return sortOrder === "asc" ? (
      <FiChevronUp className="text-blue-600" />
    ) : (
      <FiChevronDown className="text-blue-600" />
    );
  };

const resetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
  };

  // Skeleton loading state
  if (loading) {
    return <AttendanceRequestSkeleton />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Attendance Requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {pendingCount > 0 ? (
              <>
                <span className="font-semibold text-amber-600">
                  {pendingCount}
                </span>{" "}
                pending request{pendingCount !== 1 && "s"} awaiting review
              </>
            ) : (
              "Review and manage attendance correction requests"
            )}
          </p>
        </div>

        <button
          onClick={onCreate}
          className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 lg:self-auto"
        >
          <FiPlus size={18} />
          New Request
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4">
<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              showFilters
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FiFilter />
            Filters
            {(statusFilter || typeFilter) && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Types</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <FiX />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiFileText size={28} />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            {requests.length === 0
              ? "No Attendance Requests"
              : "No Matching Requests"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {requests.length === 0
              ? "Create your first attendance request to get started."
              : "Try adjusting your search or filter criteria."}
          </p>
          {requests.length === 0 ? (
            <button
              onClick={onCreate}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:translate-y-0"
            >
              <FiPlus size={18} />
              Create Request
            </button>
          ) : (
            <button
              onClick={resetFilters}
              className="mt-6 cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th
                    className="cursor-pointer px-6 py-3 font-semibold select-none"
                    onClick={() => handleSort("type")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Type
                      <SortIcon column="type" />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 font-semibold select-none"
                    onClick={() => handleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date
                      <SortIcon column="date" />
                    </span>
                  </th>
                  <th className="px-6 py-3 font-semibold">Requested Times</th>
                  <th
                    className="cursor-pointer px-6 py-3 font-semibold select-none"
                    onClick={() => handleSort("status")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      <SortIcon column="status" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((request) => {
                  const isPending = request.status === "Pending";
                  const canApprove =
                    request.requestedCheckIn || request.requestedCheckOut;

                  return (
                    <tr
                      key={request.requestId}
                      className="group transition-colors hover:bg-slate-50"
                    >
                      {/* Employee */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                            {request.employeeName
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {request.employeeName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {request.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {request.type}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDate(request.date)}
                      </td>

                      {/* Requested Times */}
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            In:{" "}
                            <span className="font-medium text-slate-800">
                              {formatTime(request.requestedCheckIn)}
                            </span>
                          </span>
                          <span>
                            Out:{" "}
                            <span className="font-medium text-slate-800">
                              {formatTime(request.requestedCheckOut)}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                            STATUS_BADGES[request.status] ||
                            "bg-slate-50 text-slate-700 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              STATUS_DOTS[request.status] || "bg-slate-500"
                            }`}
                          />
                          {request.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View */}
                          <button
                            onClick={() => onView(request)}
                            title="View details"
                            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <FiEye size={16} />
                          </button>

                          {/* Edit (pending only) */}
                          {isPending && (
                            <button
                              onClick={() => onEdit(request)}
                              title="Edit request"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600"
                            >
                              <FiEdit2 size={16} />
                            </button>
                          )}

                          {/* Approve (pending only) */}
                          {isPending && canApprove && (
                            <button
                              onClick={() => onApprove(request)}
                              title="Approve request"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <FiCheck size={16} />
                            </button>
                          )}

                          {/* Reject (pending only) */}
                          {isPending && (
                            <button
                              onClick={() => onReject(request)}
                              title="Reject request"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <FiX size={16} />
                            </button>
                          )}

                          {/* Delete (pending only) */}
                          {isPending && (
                            <button
                              onClick={() => onDelete(request)}
                              title="Delete request"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, sorted.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {sorted.length}
              </span>{" "}
              requests
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-9 min-w-9 cursor-pointer rounded-lg border px-2 text-sm font-semibold transition-colors ${
                      pageNum === currentPage
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AttendanceRequestList;
