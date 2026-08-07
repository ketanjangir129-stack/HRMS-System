import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
} from "react-icons/fi";

/*
| The cards count employees on the company wide views and days on an
| employee's own month, so the captions are overridable. Leaving them out
| keeps the wording every existing screen already shows.
*/

const DEFAULT_SUBTITLES = {
  present: "Employees Present",
  absent: "Employees Absent",
  late: "Late Arrivals",
  leave: "Employees On Leave",
};

function AttendanceSummaryCards({
  summary,
  gridClassName = "grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4",
  compact = false,
  subtitles,
}) {

  const caption = { ...DEFAULT_SUBTITLES, ...subtitles };

  const cards = [
    {
      title: "Present",
      value: summary.present,
      percentage: summary.presentPercentage,
      subtitle: caption.present,
      icon: <FiCheckCircle />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    {
      title: "Absent",
      value: summary.absent,
      percentage: summary.absentPercentage,
      subtitle: caption.absent,
      icon: <FiXCircle />,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      bar: "bg-red-500",
    },
    {
      title: "Late",
      value: summary.late,
      percentage: summary.latePercentage,
      subtitle: caption.late,
      icon: <FiClock />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
    },
    {
      title: "On Leave",
      value: summary.leave,
      percentage: summary.leavePercentage,
      subtitle: caption.leave,
      icon: <FiCalendar />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      bar: "bg-blue-500",
    },
  ];

  return (
    <div className={`grid h-full gap-6 ${gridClassName}`}>

      {cards.map((card) => (

        <div
          key={card.title}
          className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
            compact ? "min-h-[145px] p-4" : " p-6"
          }`}
        >

          {/* Top Border */}

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
          />

          {/* Header */}

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <h2 className={`mt-2 font-bold text-slate-900 ${compact ? "text-3xl" : "text-4xl"}`}>
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${card.iconBg} ${card.iconColor} transition group-hover:scale-110`}
            >
              {card.icon}
            </div>

          </div>

          {/* Progress */}

          <div className={compact ? "mt-3" : "mt-6"}>

            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">

              <span>{card.subtitle}</span>

              <span>{card.percentage}%</span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">

              <div
                className={`h-full rounded-full transition-all duration-500 ${card.bar}`}
                style={{
                  width: `${card.percentage}%`,
                }}
              />

            </div>

          </div>

        </div>

      ))}

    </div>
  );
}

export default AttendanceSummaryCards;
