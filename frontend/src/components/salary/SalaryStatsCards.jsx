import { FiAlertCircle, FiCheckCircle, FiUsers } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Salary Stats Cards
|--------------------------------------------------------------------------
| The state of the register in three numbers, laid out exactly like the
| payroll, holiday and leave cards so every dashboard reads as one product.
|
| The counts are of the whole company, never of the filtered table: a summary
| that moves with a search box is restating the rows underneath it rather
| than summarising anything.
|--------------------------------------------------------------------------
*/

function SalaryStatsCards({
    totalEmployees = 0,
    assignedCount = 0,
    loading = false,
}) {

    if (loading) {

        return (

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">

                {Array.from({ length: 3 }).map((_, index) => (

                    <div
                        key={index}
                        className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-40"
                    />

                ))}

            </div>

        );

    }

    const pendingCount = Math.max(totalEmployees - assignedCount, 0);

    const cards = [

        {
            title: "Total Employees",
            value: totalEmployees,
            subtitle: "On the register",
            icon: <FiUsers />,
            color: "bg-blue-500",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },

        {
            title: "Salary Assigned",
            value: assignedCount,
            subtitle:
                totalEmployees > 0
                    ? `${Math.round((assignedCount / totalEmployees) * 100)}% of the register covered`
                    : "Structure in place",
            icon: <FiCheckCircle />,
            color: "bg-emerald-500",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },

        {
            title: "Not Assigned",
            value: pendingCount,
            subtitle:
                pendingCount > 0
                    ? "Still awaiting a structure"
                    : "Everyone has a structure",
            icon: <FiAlertCircle />,
            color: "bg-amber-500",
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
        },

    ];

    return (

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">

            {cards.map((card) => (

                <div
                    key={card.title}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6"
                >

                    <span className={`absolute left-0 top-0 h-1 w-full ${card.color}`} />

                    <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                            <p className="truncate text-sm font-medium text-slate-500">
                                {card.title}
                            </p>

                            <h2 className="mt-1.5 truncate text-3xl font-bold text-slate-900 sm:mt-2 sm:text-4xl">
                                {card.value}
                            </h2>

                        </div>

                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
                        >
                            {card.icon}
                        </div>

                    </div>

                    <p className="mt-4 text-xs text-slate-500 sm:mt-6 sm:text-sm">
                        {card.subtitle}
                    </p>

                </div>

            ))}

        </div>

    );

}

export default SalaryStatsCards;
