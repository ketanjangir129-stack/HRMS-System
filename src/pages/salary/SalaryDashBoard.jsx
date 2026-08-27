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

            {/*
            | Header
            |
            | Same shape the Dashboard opens with: a small brand eyebrow for
            | context, the page name at heading size, and one quiet line under
            | it. No card around it — the cards below are the page's first
            | surface, and boxing the title as well made the screen read as two
            | competing headers.
            */}
            <div className="min-w-0">

                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
                    <TbReportMoney className="shrink-0" size={15} />
                    <span className="truncate">Salary</span>
                </div>

                <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
                    Salary Management
                </h1>

                <p className="mt-1 text-sm text-ink-subtle">
                    Manage all employee salary records efficiently.
                </p>

            </div>

            {/* Modules */}
            {modules.length === 0 && (
                <div className="ui-card ui-card-body text-center text-sm text-ink-subtle">
                    You do not have access to any salary module yet.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">

                {modules.map((module) => (

                    <button
                        key={module.title}
                        onClick={() => navigate(module.path)}
                        className="ui-card ui-card-interactive ui-card-body group relative cursor-pointer overflow-hidden text-left"
                    >

                        {/* Top Border */}
                        <span
                            className={`absolute left-0 top-0 h-1 w-full ${module.bar}`}
                        />

                        <div className="flex items-start justify-between gap-4">

                            <div
                                className={`ui-tile transition-transform duration-200 group-hover:scale-110 ${module.color}`}
                            >
                                {module.icon}
                            </div>

                            <FiChevronRight className="mt-3 shrink-0 text-ink-faint transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand" />

                        </div>

                        <h2 className="mt-4 text-xl font-bold text-ink transition-colors group-hover:text-brand">
                            {module.title}
                        </h2>

                        <p className="mt-2 text-sm text-ink-subtle">
                            {module.description}
                        </p>

                        <p className="ui-eyebrow mt-4">
                            {module.hint}
                        </p>

                    </button>

                ))}

            </div>

        </div>
    );
}

export default SalaryDashboard;
