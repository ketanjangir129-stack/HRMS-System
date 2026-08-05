import {
  FaClock,
  FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function AttendanceRequests({
  requests = [],
  loading,
  onApprove,
  onReject,
}) {

  const navigate = useNavigate();

  //Loading State
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        Loading requests...
      </div>
    );
  }


  // Helpers
  const badges = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-red-50 text-red-700 ring-red-200",
  };

  const pendingRequests = requests.filter(
    (request) => request.status === "Pending"
  ).length;

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (

    <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">

        <div>

          <h2 className="text-lg font-semibold text-slate-900">
            Attendance Requests
          </h2>

          <p className="mt-1 text-sm text-slate-500">

            {pendingRequests} Pending Request
            {pendingRequests !== 1 && "s"}

          </p>

        </div>

        <button
          onClick={() => navigate("/attendance/requests")}
          className="group inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >

          View All

          <FaArrowRight className="text-xs transition-transform duration-200 group-hover:translate-x-1" />

        </button>

      </div>

      {/* Empty State */}

      {requests.length === 0 ? (

        <div className="flex h-64 items-center justify-center">

          <div className="text-center">

            <FaClock
              className="mx-auto mb-3 text-slate-300"
              size={30}
            />

            <h3 className="font-semibold text-slate-700">
              No Requests
            </h3>

            <p className="mt-2 text-sm text-slate-500">

              Attendance correction requests
              will appear here.

            </p>

          </div>

        </div>

      ) : (

        <div className="divide-y divide-slate-100">

          {requests
            .slice(0, 5)
            .map((request) => (

              <div
                key={request.id}
                className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
              >

                {/* Employee */}

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">

                    {request.employeeName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}

                  </div>

                  <div className="min-w-0">

                    <h3 className="truncate font-semibold text-slate-800">

                      {request.employeeName}

                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                      <FaClock className="shrink-0" />

                      <span className="truncate">

                        {request.type}

                      </span>

                      <span className="text-slate-300">
                        •
                      </span>

                      <span className="whitespace-nowrap">

                        {formatDate(request.date)}

                      </span>

                    </div>

                  </div>

                </div>

                {/* Status */}

                {/* Actions / Status */}

                {request.status === "Pending" ? (

                  <div className="flex shrink-0 gap-2">

                    <button
                      onClick={() => onReject(request)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => onApprove(request)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Approve
                    </button>

                  </div>

                ) : (

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badges[request.status]
                      }`}
                  >
                    {request.status}
                  </span>

                )}

              </div>

            ))}

        </div>

      )}

    </div>

  );

}

export default AttendanceRequests;