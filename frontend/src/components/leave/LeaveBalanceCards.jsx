import {
  FiCalendar,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

/*
| Two across on a phone rather than stacked: five full width cards are most
| of a screen of scrolling before the content below them starts, and a
| balance is a short enough number to read at half the width.
|
| Styled to match the attendance summary cards: top accent bar, icon chip,
| and a thin progress track against the annual allocation, so a page can
| tell at a glance how much of the year is left and how much has been
| spoken for.
|
| Shared by the skeleton so the loading state occupies the same shape the
| loaded cards will, and the page does not jump when the balance arrives.
*/
const GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-5";

function LeaveBalanceCards({
  balance,
  loading,
}) {

  if (loading) {

    return (

      <div className={GRID_CLASS}>

        {Array.from({ length: 5 }).map((_, index) => (

          <div
            key={index}
            className="ui-card h-32 animate-pulse sm:h-40"
          />

        ))}

      </div>

    );

  }

  if (!balance) {

    return (

      <div className="ui-card p-6 text-center sm:p-10">

        <h3 className="font-semibold text-ink-muted">
          Leave balance not found
        </h3>

      </div>

    );

  }

  const annual = balance.annualLeave || 0;

  /*
  | Every card's bar is measured against the annual allocation: a full year
  | allocated counts as the whole track on the first card, and the others
  | read as what share of that allocation they represent.
  */
  const share = (value) =>
    annual > 0
      ? Math.min(100, Math.round((value / annual) * 100))
      : 0;

  const cards = [

    {
      title: "Annual Leave",
      value: balance.annualLeave,
      subtitle: "Allocated this year",
      icon: <FiCalendar />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      bar: "bg-blue-500",
      percentage: 100,
    },

    {
      title: "Earned",
      value: balance.earned,
      subtitle: "1 day accrued per month",
      icon: <FiTrendingUp />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
      percentage: share(balance.earned),
    },

    {
      title: "Used",
      value: balance.used,
      subtitle: "Leaves taken",
      icon: <FiCheckCircle />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
      percentage: share(balance.used),
    },

    {
      title: "Remaining",
      value: balance.remaining,
      /*
      | Pending days are still part of the remaining balance, but they are
      | already spoken for. Saying so here stops the card and the apply modal
      | from looking like they disagree.
      */
      subtitle:
        balance.pending > 0
          ? `${balance.available} available · ${balance.pending} pending`
          : "Available balance",
      icon: <FiClock />,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      bar: "bg-violet-500",
      percentage: share(balance.remaining),
    },

    {
      title: "LWP",
      value: balance.lwp,
      subtitle: "Leave Without Pay",
      icon: <FiAlertTriangle />,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      bar: "bg-red-500",
      percentage: 0,
    },

  ];

  return (

    <div className={GRID_CLASS}>

      {cards.map((card) => (

        <div
          key={card.title}
          className="ui-card ui-card-interactive group relative flex flex-col justify-center overflow-hidden p-4 sm:p-6"
        >

          {/* Top Border */}

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
          />

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                {card.title}
              </p>

              <h2 className="mt-1 text-3xl font-bold text-ink sm:mt-2 sm:text-4xl">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          <div className="mt-4 sm:mt-6">

            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-ink-subtle sm:text-xs">

              <span className="truncate">{card.subtitle}</span>

              <span className="shrink-0">{card.percentage}%</span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">

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

export default LeaveBalanceCards;
