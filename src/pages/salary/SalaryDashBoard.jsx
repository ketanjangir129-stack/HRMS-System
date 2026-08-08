import { useNavigate } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { BsClockHistory } from "react-icons/bs";
import { TbReportMoney, TbMoneybagEdit } from "react-icons/tb";
import useRoleAccess from "../../hooks/useRoleAccess";

function SalaryDashboard() {

    const navigate = useNavigate();

    const { canAccessSection } = useRoleAccess();

    /*
    | Each card opens a guarded route, so it is offered under the same
    | permission that lets that route open.
    */
    const modules = [
        {
            title: "Create & Update",
            description:
                "Assign a new salary structure or revise an existing one.",
            hint: "Earnings, deductions and net pay",
            icon: <TbMoneybagEdit size={24} />,
            color: "bg-blue-50 text-blue-600",
            bar: "bg-blue-500",
            path: "/salarydashboard/salary",
            permission: "salary.manage",
        },
        {
            title: "Revision History",
            description:
                "Track every revision made to an employee's salary.",
            hint: "What changed, by whom and when",
            icon: <BsClockHistory size={22} />,
            color: "bg-emerald-50 text-emerald-600",
            bar: "bg-emerald-500",
            path: "/salarydashboard/salary/revisions",
            permission: "salary.revisions",
        },
    ].filter((module) => canAccessSection(module.permission));

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            {/* Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-3 sm:gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
                        <TbReportMoney className="text-xl text-white" />
                    </div>

                    <div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Salary Management
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 sm:text-base">
                            Manage all employee salary records efficiently.
                        </p>

                    </div>

                </div>

            </div>

            {/* Modules */}
            {modules.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    You do not have access to any salary module yet.
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                {modules.map((module) => (

                    <button
                        key={module.title}
                        onClick={() => navigate(module.path)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                    >

                        {/* Top Border */}
                        <span
                            className={`absolute left-0 top-0 h-1 w-full ${module.bar}`}
                        />

                        <div className="flex items-start justify-between gap-4">

                            <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${module.color}`}
                            >
                                {module.icon}
                            </div>

                            <FiChevronRight className="mt-3 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-600" />

                        </div>

                        <h2 className="mt-4 text-xl font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                            {module.title}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            {module.description}
                        </p>

                        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                            {module.hint}
                        </p>

                    </button>

                ))}

            </div>

        </div>
    );
}

export default SalaryDashboard;
