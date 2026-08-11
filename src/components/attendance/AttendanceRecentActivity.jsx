import {
  FiLogIn,
  FiLogOut,
  FiClock,
} from "react-icons/fi";
import { formatTime } from "../../utils/attendance/attendanceDate";

/*
|--------------------------------------------------------------------------
| Recent Activities
|--------------------------------------------------------------------------
| The feed is built by `getAttendanceActivities`, so this component only
| renders the timeline it is given.
|--------------------------------------------------------------------------
*/

function AttendanceRecentActivity({
  activities = [],
  loading = false,
}) {

  const getActivityIcon = (type) => {

    switch (type) {

      case "punchin":
        return {
          icon: <FiLogIn />,
          color:
            "bg-emerald-50 text-emerald-600 ring-emerald-100",
        };

      case "punchout":
        return {
          icon: <FiLogOut />,
          color:
            "bg-red-50 text-red-600 ring-red-100",
        };

      case "late":
        return {
          icon: <FiClock />,
          color:
            "bg-amber-50 text-amber-600 ring-amber-100",
        };

      default:
        return {
          icon: <FiLogIn />,
          color:
            "bg-slate-50 text-slate-600 ring-slate-100",
        };

    }

  };
  const latestActivities = activities.slice(0, 10);

  return (

    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

      {/* Header */}

      <div className="mb-5 flex items-start justify-between gap-3">

        <div className="min-w-0">

          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Recent Activities
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Latest attendance updates
          </p>

        </div>

        <span className="shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {latestActivities.length} Events
        </span>

      </div>

      {/* Loading State */}

      {loading && (

        <div className="flex-1 space-y-4">

          {[0, 1, 2, 3].map((item) => (

            <div key={item} className="flex items-center gap-4">

              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />

              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded-md bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded-md bg-slate-100" />
              </div>

            </div>

          ))}

        </div>

      )}

      {/* Empty State */}

      {!loading && latestActivities.length === 0 && (

        <div className="flex flex-1 items-center justify-center">

          <div className="text-center">

            <FiClock
              className="mx-auto mb-3 text-slate-300"
              size={34}
            />

            <p className="font-medium text-slate-500">
              No activity found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Attendance activities will appear here.
            </p>

          </div>

        </div>

      )}

      {/* Timeline */}

      {!loading && latestActivities.length > 0 && (

        <div className="hide-scrollbar flex-1 overflow-y-auto">

          {latestActivities.map((item, index) => {

            const activity =
              getActivityIcon(item.type);

            return (

              <div
                key={item.id}
                className="group relative flex gap-4 pb-6 last:pb-0"
              >

                {index !== latestActivities.length - 1 && (

                  <span className="absolute bottom-0 left-5 top-11 w-px bg-slate-200" />

                )}

                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ring-4 ring-white ${activity.color}`}
                >

                  {activity.icon}

                </div>

                <div className="min-w-0 flex-1 rounded-xl px-3 py-1 transition-colors group-hover:bg-slate-50">

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-800">

                        {item.employee}

                      </p>

                      <p className="truncate text-sm text-slate-500">

                        {item.title}

                      </p>

                    </div>

                    <span className="whitespace-nowrap text-xs text-slate-400">

                      {formatTime(item.time)}

                    </span>

                  </div>

                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">

                    {item.description}

                  </p>

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

}

export default AttendanceRecentActivity;