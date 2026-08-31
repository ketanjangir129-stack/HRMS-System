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

/*
| Two across on a phone rather than stacked, the same as the holiday cards:
| four full width cards are most of a screen of scrolling before the run card
| below them starts, and a headcount is a short enough number to read at half
| the width.
|
| Shared by the skeleton so the loading state occupies the same shape the
| loaded cards will, and the page does not jump when the counts arrive.
*/
const GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4";

function PayrollStatsCards({
  totalEmployees = 0,
  generatedCount = 0,
  pendingCount = 0,
  totalPayout = 0,
  loading = false,
}) {

  if (loading) {

    return (

      <div className={GRID_CLASS}>

        {Array.from({ length: 4 }).map((_, index) => (

          <div
            key={index}
            className="ui-card h-32 animate-pulse sm:h-40"
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
      valueClass: "text-xl sm:text-3xl",
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

              <h2
                className={`mt-1 truncate font-bold text-ink sm:mt-2 ${card.valueClass || "text-2xl sm:text-4xl"}`}
              >
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
          | Left to wrap at half width rather than truncated: the generated
          | and payout captions each carry a figure, and how much of the month
          | is done is the point of the line.
          */}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-subtle sm:mt-6 sm:text-sm">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default PayrollStatsCards;
