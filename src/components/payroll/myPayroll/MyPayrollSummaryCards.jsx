import {
  FiAward,
  FiMinusCircle,
  FiTrendingUp,
  FiCreditCard,
} from "react-icons/fi";
import { formatCurrency } from "../../../utils/salary/formatCurrency";
import { formatFinancialYear } from "../../../utils/Payroll/financialYear";

/*
|--------------------------------------------------------------------------
| My Payroll Summary Cards
|--------------------------------------------------------------------------
| What the selected financial year came to, laid out exactly like the payroll,
| holiday and leave cards so every dashboard reads as one product.
|
| The first three are sums of the payslips the year actually has, and they
| balance: gross less deductions is the net beside them. Their captions say
| how many months that is, because a year three months old is not a year that
| came up short - it is a year three months in, and a total with nothing
| qualifying it invites the wrong question.
|
| The fourth is the odd one out and is drawn as such. Annual CTC is what the
| employee is *on* for the year rather than what has been paid so far, so it
| is the monthly package multiplied out - summing the months would report a
| June salary as a quarter of the package.
|--------------------------------------------------------------------------
*/

/*
| Two across on a phone rather than stacked, the same as the payroll cards:
| four full width cards are most of a screen of scrolling before the month
| card below them starts.
|
| Shared by the skeleton so the loading state occupies the shape the loaded
| cards will, and the page does not jump when the figures arrive.
*/
const GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4";

function MyPayrollSummaryCards({
  summary,
  financialYear,
  loading = false,
}) {

  if (loading) {

    return (

      <div className={GRID_CLASS}>

        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ui-card h-32 animate-pulse sm:h-40" />
        ))}

      </div>

    );

  }

  const {
    payslipCount = 0,
    grossEarnings = 0,
    totalDeductions = 0,
    netSalary = 0,
    monthlyGross = 0,
    annualCtc = 0,
  } = summary || {};

  /*
  | The line all three sums carry, so the reader is never left guessing what
  | span a total covers.
  */
  const span = payslipCount
    ? `Across ${payslipCount} payslip${payslipCount === 1 ? "" : "s"} this year`
    : `Nothing paid yet in ${formatFinancialYear(financialYear)}`;

  const cards = [

    {
      title: "Gross Salary",
      value: formatCurrency(grossEarnings),
      subtitle: span,
      icon: <FiTrendingUp />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },



    {
      title: "Net Salary",
      value: formatCurrency(netSalary),
      subtitle: payslipCount
        ? "Paid into your account this year"
        : span,
      icon: <FiCreditCard />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Total Deductions",
      value: formatCurrency(totalDeductions),
      subtitle: payslipCount
        ? "Statutory, structure and loss of pay"
        : span,
      icon: <FiMinusCircle />,
      color: "bg-rose-500",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },

    {
      title: "Annual CTC",
      value: formatCurrency(annualCtc),
      subtitle: monthlyGross
        ? `${formatCurrency(monthlyGross)} a month, over 12 months`
        : "No salary structure assigned yet",
      icon: <FiAward />,
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

          <span className={`absolute left-0 top-0 h-1 w-full ${card.color}`} />

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                {card.title}
              </p>

              {/*
              | Currency runs far wider than a count, so every value here is
              | stepped down from the headline size the counting cards use and
              | truncates rather than wrapping out of the card.
              */}
              <h2 className="mt-1 truncate text-xl font-bold text-ink sm:mt-2 sm:text-3xl">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          {/* Left to wrap at half width rather than truncated: each caption
              says what its figure covers, which is the point of the line. */}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-subtle sm:mt-6 sm:text-sm">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default MyPayrollSummaryCards;
