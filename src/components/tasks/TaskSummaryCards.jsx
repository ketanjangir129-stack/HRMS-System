import { FiAlertTriangle, FiCalendar, FiLayers, FiLoader } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Task Summary Cards
|--------------------------------------------------------------------------
| Ginti khud nahi karta — taskUtils.js ke taskSummary() se banaya hua object
| leta hai.
|
| Chaar cards wahi hain jo owner ko roz dekhne hote hain: kul kitna kaam hai,
| aaj kya nikalna hai, kya chal raha hai, aur kya bigad chuka hai.
| To Do aur Completed ki poori distribution TaskProgress section mein hai.
|
| Layout AttendanceSummaryCards jaisa hi: upar rangeen patti, neeche progress
| bar jo total ke hisaab se bharta hai — chaaron ka denominator total hi hai,
| isliye percent aapas mein compare ho sakte hain.
|--------------------------------------------------------------------------
*/

function TaskSummaryCards({ summary }) {
  const total = summary.total || 0;

  // Kitne percent — total 0 ho to 0, warna divide by zero NaN de dega
  const percent = (value) => (total ? Math.round((value / total) * 100) : 0);

  const cards = [
    {
      title: "Total tasks",
      value: summary.total,
      percentage: 100,
      subtitle: "Total assigned",
      icon: <FiLayers />,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      bar: "bg-violet-500",
    },
    {
      title: "Due today",
      value: summary.dueToday,
      percentage: percent(summary.dueToday),
      subtitle: "Pending today",
      icon: <FiCalendar />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
    },
    {
      title: "In progress",
      value: summary.active,
      percentage: percent(summary.active),
      subtitle: "Being worked on",
      icon: <FiLoader />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      bar: "bg-blue-500",
    },
    {
      title: "Overdue",
      value: summary.overdue,
      percentage: percent(summary.overdue),
      subtitle: "Past due date",
      icon: <FiAlertTriangle />,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      bar: "bg-red-500",
    },
  ];

  return (
    <div className="grid h-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          {/* Top Border */}
          <span className={`absolute left-0 top-0 h-1 w-full ${card.bar}`} />

          {/* Header */}
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
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${card.iconBg} ${card.iconColor} transition group-hover:scale-110`}
            >
              {card.icon}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{card.subtitle}</span>
              <span>{card.percentage}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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

export default TaskSummaryCards;
