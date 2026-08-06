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

function HolidayStatsCards({ stats, loading = false }) {

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

export default HolidayStatsCards;
