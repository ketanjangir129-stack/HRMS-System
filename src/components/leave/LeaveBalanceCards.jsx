import {
  FiCalendar,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

function LeaveBalanceCards({
  balance,
  loading,
}) {

  if (loading) {

    return (

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">

        {Array.from({ length: 5 }).map((_, index) => (

          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />

        ))}

      </div>

    );

  }

  if (!balance) {

    return (

      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">

        <h3 className="font-semibold text-slate-700">
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

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">

      {cards.map((card) => (

        <div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.color}`}
          />

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-900">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          <p className="mt-6 text-sm text-slate-500">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default LeaveBalanceCards;