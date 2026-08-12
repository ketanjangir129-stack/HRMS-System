import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiFlag,
  FiGift,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Holiday Stats Cards
|--------------------------------------------------------------------------
| The five counts of the selected year, laid out exactly like the leave
| balance cards so the two dashboards read as one product.
|
| Optional is a flag rather than a type, so its card counts across the other
| three and the four type cards still add up to the total.
|--------------------------------------------------------------------------
*/

/*
| Two across on a phone rather than stacked: five full width cards are most of
| a screen of scrolling before the calendar below them starts, and a holiday
| count is a short enough number to read at half the width. Three across from
| `md` so a tablet does not leave half of each row empty.
|
| Shared by the skeleton so the loading state occupies the same shape the
| loaded cards will, and the page does not jump when the counts arrive.
*/
const GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-5";

function HolidayStatsCards({ stats, loading = false }) {

  if (loading) {

    return (

      <div className={GRID_CLASS}>

        {Array.from({ length: 5 }).map((_, index) => (

          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-40"
          />

        ))}

      </div>

    );

  }

  const total = stats?.total || 0;

  const cards = [

    {
      title: "Total Holidays",
      value: total,
      subtitle:
        stats?.upcoming > 0
          ? `${stats.upcoming} still upcoming`
          : "Declared this year",
      icon: <FiCalendar />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },

    {
      title: "National",
      value: stats?.national || 0,
      subtitle: "Government declared",
      icon: <FiFlag />,
      color: "bg-sky-500",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },

    {
      title: "Festival",
      value: stats?.festival || 0,
      subtitle: "Religious and cultural",
      icon: <FiGift />,
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },

    {
      title: "Company",
      value: stats?.company || 0,
      subtitle: "Declared by the company",
      icon: <FiBriefcase />,
      color: "bg-violet-500",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },

    {
      title: "Optional",
      value: stats?.optional || 0,
      /*
      | Optional days are the ones an employee chooses, so the mandatory count
      | is stated next to them rather than left to be worked out.
      */
      subtitle:
        total > 0
          ? `${stats?.mandatory || 0} mandatory`
          : "Employee's choice",
      icon: <FiAward />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },

  ];

  return (

    <div className={GRID_CLASS}>

      {cards.map((card) => (

        <div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6"
        >

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.color}`}
          />

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                {card.title}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-4xl">
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

          </div>

          {/*
          | The optional card's caption carries two figures, so it is left to
          | wrap at half width rather than truncated: how many of the days are
          | mandatory is the point of the line.
          */}
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500 sm:mt-6 sm:text-sm">
            {card.subtitle}
          </p>

        </div>

      ))}

    </div>

  );

}

export default HolidayStatsCards;
