import {
    FiArrowRight,
    FiCalendar,
    FiChevronDown,
    FiMinus,
    FiTrendingDown,
    FiTrendingUp,
    FiUser,
} from "react-icons/fi";
import { BsClockHistory } from "react-icons/bs";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import { formatRevisionDateTime } from "../../utils/salary/formatSalaryDate";

/*
|--------------------------------------------------------------------------
| Salary Revision Card
|--------------------------------------------------------------------------
| One revision: who it was for, when it happened, who made it and what it did
| to the take home pay — with the field by field difference behind a click.
|
| Collapsed it answers the question most people came with, which is whether
| the pay went up or down and by how much. The breakdown is the follow up, so
| it costs a click rather than the whole card's height.
|
| The card is opened by a `grid-rows` transition rather than by mounting the
| details on demand: an unmounted panel cannot animate, and a `max-height`
| guess is either short for a long revision or slow for a one field one.
|
| Whether the card is open is the panel's business — several are on screen at
| once and only one may be open, so that state cannot live in here.
|--------------------------------------------------------------------------
*/

function SalaryRevisionCard({
    revision,
    isOpen = false,
    onToggle,
    onViewEmployeeHistory,
}) {

    const increased = revision.netDifference > 0;
    const decreased = revision.netDifference < 0;

    return (

        <div
            className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${isOpen
                ? "border-blue-200 shadow-lg"
                : "border-slate-200 hover:shadow-lg"
                }`}
        >

            {/* Top Border */}
            <span
                className={`absolute left-0 top-0 h-1 w-full transition-colors duration-300 ${isOpen ? "bg-blue-500" : "bg-slate-200"
                    }`}
            />

            {/* Card Header */}
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer flex-col gap-4 p-4 text-left sm:p-6 lg:flex-row lg:items-center lg:justify-between"
            >

                <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base font-bold text-blue-600">
                        {(revision.employeeName || "?")
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                        <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                            {revision.employeeName}
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-500 sm:mt-1 sm:text-sm">
                            {revision.employeeId} · {revision.department}
                        </p>

                    </div>

                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Revision #{revision.revisionNumber}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">

                        <FiCalendar size={12} />

                        {formatRevisionDateTime(revision.updatedAt)}

                    </span>

                    {/*
                    | Who made the change is the one badge that can run long, so
                    | it is the one held back until there is a line to spare.
                    */}
                    <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600 sm:inline-flex">

                        <FiUser size={12} />

                        {revision.updatedByName}
                        {revision.updatedBy?.role
                            ? ` · ${revision.updatedBy.role}`
                            : ""}

                    </span>

                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${increased
                            ? "bg-emerald-50 text-emerald-700"
                            : decreased
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                    >

                        {increased ? (
                            <FiTrendingUp size={12} />
                        ) : decreased ? (
                            <FiTrendingDown size={12} />
                        ) : (
                            <FiMinus size={12} />
                        )}

                        {increased ? "+" : ""}
                        {formatCurrency(revision.netDifference)} net

                    </span>

                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">

                        {revision.changes.length}{" "}
                        {revision.changes.length === 1 ? "change" : "changes"}

                        <FiChevronDown
                            size={16}
                            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                                }`}
                        />

                    </span>

                </div>

            </button>

            {/* Details */}
            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                    }`}
            >

                <div className="overflow-hidden">

                    <div className="border-t border-slate-100 px-4 pb-4 sm:px-6 sm:pb-6">

                        {!revision.changes.length ? (

                            <p className="pt-5 text-sm text-slate-500">
                                No field level differences were recorded for
                                this revision.
                            </p>

                        ) : (

                            <div className="mt-5 space-y-5">

                                {revision.sections.map((section) => (

                                    <div
                                        key={section.group}
                                        className="overflow-hidden rounded-xl border border-slate-200"
                                    >

                                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">

                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {section.group}
                                            </h3>

                                            <span className="text-xs font-medium text-slate-400">
                                                {section.changes.length}{" "}
                                                {section.changes.length === 1
                                                    ? "change"
                                                    : "changes"}
                                            </span>

                                        </div>

                                        <div className="divide-y divide-slate-100">

                                            {section.changes.map((change) => {

                                                const isCurrency =
                                                    change.type === "currency";

                                                const up =
                                                    isCurrency &&
                                                    change.difference > 0;

                                                return (

                                                    <div
                                                        key={change.key}
                                                        className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                                                    >

                                                        <span className="font-medium text-slate-600">
                                                            {change.label}
                                                        </span>

                                                        <div className="flex flex-wrap items-center gap-3">

                                                            <span className="text-slate-400 line-through">
                                                                {isCurrency
                                                                    ? formatCurrency(change.from)
                                                                    : change.from}
                                                            </span>

                                                            <FiArrowRight
                                                                size={14}
                                                                className="text-slate-300"
                                                            />

                                                            <span className="font-semibold text-slate-900">
                                                                {isCurrency
                                                                    ? formatCurrency(change.to)
                                                                    : change.to}
                                                            </span>

                                                            {isCurrency && (

                                                                <span
                                                                    className={`inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${up
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : "bg-red-50 text-red-700"
                                                                        }`}
                                                                >

                                                                    {up ? (
                                                                        <FiTrendingUp size={11} />
                                                                    ) : (
                                                                        <FiTrendingDown size={11} />
                                                                    )}

                                                                    {up ? "+" : ""}
                                                                    {formatCurrency(change.difference)}

                                                                </span>

                                                            )}

                                                        </div>

                                                    </div>

                                                );

                                            })}

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                        {/* Footer */}
                        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <FiUser size={16} />
                                </div>

                                <div className="min-w-0">

                                    <p className="text-xs capitalize text-slate-500">
                                        Changed by ·{" "}
                                        {revision.updatedBy?.role || "unknown"}
                                    </p>

                                    <p className="truncate text-sm font-semibold text-slate-800">
                                        {revision.updatedByName}
                                        {revision.updatedBy?.employeeId
                                            ? ` (${revision.updatedBy.employeeId})`
                                            : ""}
                                    </p>

                                </div>

                            </div>

                            {onViewEmployeeHistory && (

                                <button
                                    type="button"
                                    onClick={() =>
                                        onViewEmployeeHistory(revision.employeeId)
                                    }
                                    className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-500 hover:text-blue-600"
                                >

                                    <BsClockHistory size={15} />

                                    View employee history

                                </button>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default SalaryRevisionCard;
