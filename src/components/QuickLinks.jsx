import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
    Building,
    Building2,
    CalendarCheck,
    ListChecks,
    ReceiptIndianRupee,
    UserRoundPlus,
    Users,
    Wallet,
} from "lucide-react";
import useRoleAccess from "../hooks/useRoleAccess";

/* Quick Find (Dashboard card) */

/*
    Every tile carries the permission its screen is offered under, the same way
    the sidebar menu does. A shortcut to a page the role cannot open is not
    dimmed, it is not in the grid at all - offering it would only lead to the
    route guard turning it away.
*/

const LINKS = [
    {
        label: "Employees",
        icon: Users,
        path: "/employees",
        permission: "employees",
        tile: "bg-indigo-100 text-indigo-600",
        hover: "hover:border-indigo-200 hover:bg-indigo-50/60",
        text: "group-hover:text-indigo-600",
    },
    {
        label: "Payroll",
        icon: ReceiptIndianRupee,
        path: "/payrolldashboard",
        permission: "payroll",
        tile: "bg-emerald-100 text-emerald-600",
        hover: "hover:border-emerald-200 hover:bg-emerald-50/60",
        text: "group-hover:text-emerald-600",
    },
    {
        label: "Departments",
        icon: Building2,
        path: "/departments",
        permission: "departments",
        tile: "bg-amber-100 text-amber-600",
        hover: "hover:border-amber-200 hover:bg-amber-50/60",
        text: "group-hover:text-amber-600",
    },
    {
        label: "OnBoarding",
        icon: UserRoundPlus,
        path: "/OnboardDashboard",
        permission: "onboarding",
        tile: "bg-rose-100 text-rose-600",
        hover: "hover:border-rose-200 hover:bg-rose-50/60",
        text: "group-hover:text-rose-600",
    },
    {
        label: "Tasks",
        icon: ListChecks,
        path: "/tasks",
        permission: "tasks",
        tile: "bg-teal-100 text-teal-600",
        hover: "hover:border-teal-200 hover:bg-teal-50/60",
        text: "group-hover:text-teal-600",
    },
    {
        label: "Attendance",
        icon: CalendarCheck,
        path: "/attendance",
        permission: "attendance",
        tile: "bg-pink-100 text-pink-600",
        hover: "hover:border-pink-200 hover:bg-pink-50/60",
        text: "group-hover:text-pink-600",
    },
    {
        label: "Salary",
        icon: Wallet,
        path: "/salarydashboard",
        permission: "salary",
        tile: "bg-violet-100 text-violet-600",
        hover: "hover:border-violet-200 hover:bg-violet-50/60",
        text: "group-hover:text-violet-600",
    },
];

/*
    Stand-ins for the tiles while the configuration is read. Rendering the full
    grid first would show shortcuts that are about to disappear.
*/

function QuickLinksSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 gap-3 sm:gap-4">

            {Array.from({ length: 6 }).map((_, index) => (

                <div
                    key={index}
                    className="flex flex-col items-center rounded-xl border border-line-subtle bg-surface-muted/50 p-4"
                >

                    <span className="mb-2 h-10 w-10 animate-pulse rounded-xl bg-surface-raised" />

                    <span className="h-3 w-16 animate-pulse rounded bg-surface-raised" />

                </div>

            ))}

        </div>
    );
}

function QuickLinks() {
    const navigate = useNavigate();

    const { canAccessPage, loading } = useRoleAccess();

    const visibleLinks = useMemo(
        () => LINKS.filter((link) => canAccessPage(link.permission)),
        [canAccessPage]
    );

    /*
        A role with none of these screens gets no card rather than an empty
        one standing under its heading.
    */
    if (!loading && visibleLinks.length === 0) return null;

    return (
        <div className="ui-card ui-card-body">

            <div className="mb-5">
                <h2 className="ui-card-title">Quick Find</h2>
                <p className="ui-card-subtitle">Jump straight to a section</p>
            </div>

            {loading ? (

                <QuickLinksSkeleton />

            ) : (

            /* Two per row on a phone, four once there is room, back to three
                beside the tasks card on a wide screen. */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 gap-3 sm:gap-4">

                {visibleLinks.map((link) => {

                    const Icon = link.icon;

                    const isLink = Boolean(link.path);

                    return (
                        <button
                            key={link.label}
                            type="button"
                            disabled={!isLink}
                            onClick={isLink ? () => navigate(link.path) : undefined}
                            className={`group flex flex-col items-center rounded-xl border border-line-subtle bg-surface-muted/50 p-4 text-center transition-all ${
                                isLink
                                    ? `cursor-pointer ${link.hover}`
                                    : "cursor-default"
                            }`}
                        >

                            <span
                                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-transform ${link.tile} ${
                                    isLink ? "group-hover:scale-110" : ""
                                }`}
                            >
                                <Icon size={20} strokeWidth={1.75} />
                            </span>

                            <span
                                className={`text-xs font-semibold text-ink-muted transition-colors ${link.text}`}
                            >
                                {link.label}
                            </span>

                        </button>
                    );

                })}

            </div>

            )}

        </div>
    );
}

export default QuickLinks;
