import { FiCheckCircle, FiClock, FiTrendingUp, FiUsers } from "react-icons/fi";
import { formatCurrency } from "../../utils/salary/formatCurrency";

/*
|--------------------------------------------------------------------------
| Payroll Stats Cards
|--------------------------------------------------------------------------
| The four numbers of the selected month, laid out exactly like the holiday
| and leave cards so the dashboards read as one product.
|
| The payout is the sum of what has already been generated, never of what is
| owed: a pending employee has no snapshot yet, so there is no figure to add.
| The subtitle says so, otherwise the total looks short of the payroll the
| month will actually cost.
|--------------------------------------------------------------------------
*/

function PayrollStatsCards({
  totalEmployees = 0,
  generatedCount = 0,
  pendingCount = 0,
  totalPayout = 0,
  loading = false,
}) {

  if (loading) {

    return (

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

        {Array.from({ length: 4 }).map((_, index) => (

          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />

        ))}

      </div>

    );

  }

  const cards = [

    {
      title: "Total Employees",
      value: totalEmployees,
      subtitle: "On the payroll register",
      icon: <FiUsers />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },

    {
      title: "Generated",
      value: generatedCount,
      subtitle:
        totalEmployees > 0
          ? `${Math.round((generatedCount / totalEmployees) * 100)}% of the month complete`
          : "Nothing generated yet",
      icon: <FiCheckCircle />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },

    {
      title: "Pending",
      value: pendingCount,
      subtitle:
        pendingCount > 0
          ? "Still waiting to be generated"
          : "Every employee is done",
      icon: <FiClock />,
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },

    {
      title: "Net Payout",
      value: formatCurrency(totalPayout),
      /*
      | Currency runs far wider than a count, so this one card steps its value
      | down instead of letting the number wrap out of the card.
      */
      valueClass: "text-2xl sm:text-3xl",
      subtitle:
        pendingCount > 0
          ? `Across ${generatedCount} generated payslip${generatedCount === 1 ? "" : "s"}`
          : "Total payable this month",
      icon: <FiTrendingUp />,
      color: "bg-violet-500",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },

  ];

  return (

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

      {cards.map((card) => (

        <div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >

          <span className={`absolute left-0 top-0 h-1 w-full ${card.color}`} />

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <h2
                className={`mt-2 truncate font-bold text-slate-900 ${card.valueClass || "text-4xl"}`}
              >
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${card.iconBg} ${card.iconColor}`}
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

export default PayrollStatsCards;
