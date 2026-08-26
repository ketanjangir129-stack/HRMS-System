import { useNavigate } from "react-router-dom";
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

/*
|--------------------------------------------------------------------------
| Quick Find (Dashboard card)
|--------------------------------------------------------------------------
| The eight places somebody lands on most, as one grid of tiles.
|
| The tiles were eight hand-written blocks that differed only in their icon,
| hue and destination, which is how three of them had drifted onto a
| different icon set and one onto a grey that read as disabled. They are one
| list now, so a tile cannot drift from its neighbours.
|
| The icons are `lucide-react`, and deliberately the same glyphs the sidebar
| uses: a shortcut to Employees and the Employees item in the menu are the
| same picture, so the tile is recognised as the link it duplicates rather
| than read as a different feature.
|
| The hue is per destination and stays put, because it is the fastest thing
| to aim at - after a week the amber tile IS Departments, and shuffling the
| colours would cost more than it gained.
|--------------------------------------------------------------------------
*/

const LINKS = [
    {
        label: "Employees",
        icon: Users,
        path: "/employees",
        tile: "bg-indigo-100 text-indigo-600",
        hover: "hover:border-indigo-200 hover:bg-indigo-50/60",
        text: "group-hover:text-indigo-600",
    },
    {
        label: "Payroll",
        icon: ReceiptIndianRupee,
        path: "/payrolldashboard",
        tile: "bg-emerald-100 text-emerald-600",
        hover: "hover:border-emerald-200 hover:bg-emerald-50/60",
        text: "group-hover:text-emerald-600",
    },
    {
        label: "Departments",
        icon: Building2,
        path: "/departments",
        tile: "bg-amber-100 text-amber-600",
        hover: "hover:border-amber-200 hover:bg-amber-50/60",
        text: "group-hover:text-amber-600",
    },
    {
        label: "OnBoarding",
        icon: UserRoundPlus,
        path: "/OnboardDashboard",
        tile: "bg-rose-100 text-rose-600",
        hover: "hover:border-rose-200 hover:bg-rose-50/60",
        text: "group-hover:text-rose-600",
    },
    {
        label: "Tasks",
        icon: ListChecks,
        path: "/tasks",
        tile: "bg-teal-100 text-teal-600",
        hover: "hover:border-teal-200 hover:bg-teal-50/60",
        text: "group-hover:text-teal-600",
    },
    {
        label: "Attendance",
        icon: CalendarCheck,
        path: "/attendance",
        tile: "bg-pink-100 text-pink-600",
        hover: "hover:border-pink-200 hover:bg-pink-50/60",
        text: "group-hover:text-pink-600",
    },
    /*
    | No destination yet - the Offices screen does not exist. It is rendered
    | as plain text rather than a button so it does not offer a click that
    | goes nowhere, and keeps its place in the grid.
    */
    {
        label: "Offices",
        icon: Building,
        tile: "bg-cyan-100 text-cyan-600",
        hover: "",
        text: "",
    },
    {
        label: "Salary",
        icon: Wallet,
        path: "/salarydashboard",
        tile: "bg-violet-100 text-violet-600",
        hover: "hover:border-violet-200 hover:bg-violet-50/60",
        text: "group-hover:text-violet-600",
    },
];

function QuickLinks() {
    const navigate = useNavigate();

    return (
        <div className="ui-card ui-card-body">

            <div className="mb-5">
                <h2 className="ui-card-title">Quick Find</h2>
                <p className="ui-card-subtitle">Jump straight to a section</p>
            </div>

            {/* Two per row on a phone, four once there is room, back to three
                beside the tasks card on a wide screen. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 gap-3 sm:gap-4">

                {LINKS.map((link) => {

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

        </div>
    );
}

export default QuickLinks;
