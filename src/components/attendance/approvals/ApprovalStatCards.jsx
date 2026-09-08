import {
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Approval Stat Cards
|--------------------------------------------------------------------------
| What the selected period looks like as a decision list, not as attendance.
|
| The attendance summary cards next door count Present, Absent, Late and
| Leave, which is what a day of attendance was. These four count what has been
| decided about it, which is a different question and the only one this screen
| is asking. Sharing one component would have meant a card block that answers
| neither well.
|
| The fourth card is the one worth reading first: an approved count means very
| little while a third of the month is still sitting in the queue behind it,
| so the reviewed share is stated on its own rather than inferred.
|--------------------------------------------------------------------------
*/

function ApprovalStatCards({ summary, loading = false }) {

  const cards = [
    {
      title: "Pending",
      value: summary.pending,
      percentage: summary.pendingPercentage,
      subtitle: "Days awaiting your decision",
      icon: <FiClock />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
    },
    {
      title: "Approved",
      value: summary.approved,
      percentage: summary.approvedPercentage,
      subtitle: "Days signed off",
      icon: <FiCheckCircle />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    {
      title: "Rejected",
      value: summary.rejected,
      percentage: summary.rejectedPercentage,
      subtitle: "Days turned down",
      icon: <FiXCircle />,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      bar: "bg-red-500",
    },
    {
      title: "Reviewed",
      value: `${summary.reviewedPercentage}%`,
      percentage: summary.reviewedPercentage,
      subtitle: `${summary.approved + summary.rejected} of ${summary.total} days`,
      icon: <FiTrendingUp />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      bar: "bg-blue-500",
    },
  ];

  /*
  | Stand ins while the month is read. Rendering four zeroes first would say
  | the period is empty and then contradict itself a moment later, which on a
  | queue is the one wrong answer that looks like a right one.
  */
  if (loading) {

    return (
      <div className="grid gap-3 grid-cols-2 sm:gap-6 xl:grid-cols-4">

        {cards.map((card) => (

          <div
            key={card.title}
            className="ui-card min-h-32 p-4 sm:min-h-36.25 sm:p-6"
          >

            <div className="flex items-start justify-between gap-2">

              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-raised" />
                <div className="h-7 w-14 animate-pulse rounded bg-surface-raised" />
              </div>

              <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-surface-raised sm:h-12 sm:w-12" />

            </div>

            <div className="mt-4 h-2 animate-pulse rounded-full bg-surface-muted sm:mt-6" />

          </div>

        ))}

      </div>
    );

  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-6 xl:grid-cols-4">

      {cards.map((card) => (

        <div
          key={card.title}
          className="ui-card ui-card-interactive group relative flex flex-col justify-center overflow-hidden p-4 sm:p-6"
        >

          {/* Top Border */}
          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                {card.title}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-ink sm:mt-2 sm:text-3xl">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor} transition group-hover:scale-110`}
            >
              {card.icon}
            </div>

          </div>

          {/* Progress */}
          <div className="mt-4 sm:mt-6">

            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-ink-subtle sm:text-xs">

              <span className="truncate">{card.subtitle}</span>

              <span className="shrink-0">{card.percentage}%</span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">

              <div
                className={`h-full rounded-full transition-all duration-500 ${card.bar}`}
                style={{ width: `${card.percentage}%` }}
              />

            </div>

          </div>

        </div>

      ))}

    </div>
  );

}

export default ApprovalStatCards;
