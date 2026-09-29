import {
  FiCalendar,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

/*
| Two across on a phone rather than stacked: five full width cards are most
| of a screen of scrolling before the calendar below them starts, and a
| balance is a short enough number to read at half the width. Three across
| from `md` so a tablet does not leave half of each row empty.
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

  const cards = [

    {
      title: "Annual Leave",
      value: balance.annualLeave,
      subtitle: "Allocated this year",
      icon: <FiCalendar />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },

    {
      title: "Earned",
      value: balance.earned,
      subtitle: "Leaves earned",
      icon: <FiTrendingUp />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },

    {
      title: "Used",
      value: balance.used,
      subtitle: "Leaves taken",
      icon: <FiCheckCircle />,
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
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
      color: "bg-violet-500",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },

    {
      title: "LWP",
      value: balance.lwp,
      subtitle: "Leave Without Pay",
      icon: <FiAlertTriangle />,
      color: "bg-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },

  ];

  return (

    <div className={GRID_CLASS}>

      {cards.map((card) => (

        <div
          key={card.title}
          className="ui-card ui-card-interactive group relative overflow-hidden p-4 sm:p-6"
        >

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.color}`}
          />

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                {card.title}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-ink sm:mt-2 sm:text-4xl">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          {/*
          | The remaining card's caption carries two figures, so it is left to
          | wrap at half width rather than truncated: which part of the balance
          | is already spoken for is the point of the line.
          */}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-subtle sm:mt-6 sm:text-sm">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default LeaveBalanceCards;