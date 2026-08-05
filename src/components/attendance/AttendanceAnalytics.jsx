import {
  FiClock,
  FiTrendingUp,
  FiUserCheck,
  FiAlertCircle,
} from "react-icons/fi";

function AttendanceAnalytics({ analytics }) {

  const analyticsCards = [
    {
      title: "Present Rate",
      value: `${analytics.presentRate}%`,
      progress: analytics.presentRate,
      icon: <FiUserCheck />,
      iconColor: "bg-emerald-50 text-emerald-600",
      color: "bg-emerald-500",
      subtitle: `${analytics.presentEmployees} employees present`,
    },
    {
      title: "Avg. Punch-In",
      value: analytics.averagePunchIn,
      progress: 100,
      icon: <FiClock />,
      iconColor: "bg-blue-50 text-blue-600",
      color: "bg-blue-500",
      subtitle: "Today's average",
    },
    {
      title: "Working Hours",
      value: analytics.averageWorkingHours,
      progress: analytics.workingHoursProgress,
      icon: <FiTrendingUp />,
      iconColor: "bg-purple-50 text-purple-600",
      color: "bg-purple-500",
      subtitle: "Average working hours",
    },
    {
      title: "Late Arrivals",
      value: analytics.lateEmployees,
      progress: analytics.lateRate,
      icon: <FiAlertCircle />,
      iconColor: "bg-amber-50 text-amber-600",
      color: "bg-amber-500",
      subtitle: "Employees marked late",
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Header */}

      <div className="mb-6 flex items-start justify-between">

        <div>

          <h2 className="text-lg font-semibold text-slate-900">
            Attendance Analytics
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Today's attendance insights
          </p>

        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">

          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />

          Live

        </span>

      </div>

      {/* Analytics */}

      <div className="flex flex-1 flex-col justify-between gap-4">

        {analyticsCards.map((item) => (

          <div key={item.title}>

            <div className="mb-2 flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${item.iconColor}`}
                >
                  {item.icon}
                </div>

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.subtitle}
                  </p>

                </div>

              </div>

              <span className="whitespace-nowrap text-base font-bold text-slate-900">
                {item.value}
              </span>

            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                style={{
                  width: `${item.progress}%`,
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AttendanceAnalytics;
