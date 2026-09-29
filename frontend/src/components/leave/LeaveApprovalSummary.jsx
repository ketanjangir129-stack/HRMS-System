import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";
import { formatLeaveDuration } from "../../utils/leave/leaveUtils";

/*
| `formatLeaveDuration` renders an empty duration as "--", which reads as
| missing data rather than as a count. In a subtitle a zero is a real answer.
*/

const formatDays = (days) =>
  days ? formatLeaveDuration(days) : "0 Days";

/*
|--------------------------------------------------------------------------
| Leave Approval Summary
|--------------------------------------------------------------------------
| The state of the approval queue above the list: what is waiting, what has
| been decided, and how many days have already been granted.
|
| The counts are computed from the same filtered list the table renders, so
| the numbers always describe what is on screen.
|--------------------------------------------------------------------------
*/

function LeaveApprovalSummary({ summary, loading = false }) {

  if (loading) {

    return (

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

        {Array.from({ length: 4 }).map((_, index) => (

          <div
            key={index}
            className="ui-card h-36 animate-pulse"
          />

        ))}

      </div>

    );

  }

  const cards = [

    {
      title: "Pending",
      value: summary.pending,
      subtitle: `${formatDays(summary.pendingDays)} awaiting review`,
      icon: <FiClock />,
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },

    {
      title: "Approved",
      value: summary.approved,
      subtitle: `${formatDays(summary.approvedDays)} granted`,
      icon: <FiCheckCircle />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },

    {
      title: "Rejected",
      value: summary.rejected,
      subtitle: "Turned down requests",
      icon: <FiXCircle />,
      color: "bg-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },

    {
      title: "Total Requests",
      value: summary.total,
      subtitle: "In the selected year",
      icon: <FiCalendar />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },

  ];

  return (

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

      {cards.map((card) => (

        <div
          key={card.title}
          className="ui-card ui-card-interactive group relative overflow-hidden p-6"
        >

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.color}`}
          />

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-ink-subtle">
                {card.title}
              </p>

              <h2 className="mt-2 text-4xl font-bold text-ink">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition group-hover:scale-110 ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          <p className="mt-5 text-sm text-ink-subtle">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default LeaveApprovalSummary;
