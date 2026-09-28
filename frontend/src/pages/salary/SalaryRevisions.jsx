import { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    FiTrendingUp,
    FiTrendingDown,
    FiCalendar,
    FiUser,
    FiInbox,
    FiArrowRight,
    FiChevronDown,
    FiMinus,
} from "react-icons/fi";
import { BsClockHistory } from "react-icons/bs";
import { getSalaryRevisions } from "../../services/SalaryService";
import {
    buildSalaryChanges,
    groupSalaryChanges,
} from "../../utils/salary/salaryDiff";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import { filterData } from "../../utils/search/filterData";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import Loader from "../../components/common/Loader";

const PAGE_SIZE = 10;

function SalaryRevisions() {

    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    const { search, setSearch, setSearchPlaceholder } =
        useOutletContext();

    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [employeeFilter, setEmployeeFilter] = useState("All");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const loadRevisions = async () => {
        setLoading(true);
        try {
            const data = await getSalaryRevisions(companyCode);
            setRevisions(data);
        }
        catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRevisions();
    }, []);

    useEffect(() => {
        setSearchPlaceholder("Search revisions...");
        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };
    }, []);

    const toggleRevision = (id) => {
        setSelectedId((current) => (current === id ? null : id));
    };

    const formatDateTime = (value) => {
        if (!value) {
            return "—";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    // changes are derived once per revision, the cards only read them
    const detailedRevisions = useMemo(
        () =>
            revisions.map((revision) => {
                const changes = buildSalaryChanges(
                    revision.previous,
                    revision.current
                );
                return {
                    ...revision,
                    changes,
                    sections: groupSalaryChanges(changes),
                    updatedByName:
                        revision.updatedBy?.name || "Unknown",
                    netDifference:
                        Number(revision.current?.netSalary || 0) -
                        Number(revision.previous?.netSalary || 0),
                };
            }),
        [revisions]
    );

    const employees = [
        "All",
        ...new Set(
            detailedRevisions.map(
                (revision) => revision.employeeName
            )
        ),
    ];

    const filteredRevisions = useMemo(() => {

        let data = filterData(
            detailedRevisions,
            search,
            [
                "employeeId",
                "employeeName",
                "department",
                "designation",
                "updatedByName",
                "updatedBy.role",
            ]
        );

        if (employeeFilter !== "All") {
            data = data.filter(
                (revision) =>
                    revision.employeeName === employeeFilter
            );
        }

        return data;

    }, [detailedRevisions, search, employeeFilter]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [search, employeeFilter]);

    const visibleRevisions = filteredRevisions.slice(0, visibleCount);

    const header = (
        <SalaryPageHeader
            title="Salary Revision History"
            subtitle="Every change made to employee salary structures"
            icon={<BsClockHistory />}
            backTo="/salarydashboard"
            action={
                detailedRevisions.length > 0 && (
                    <div className="ui-card flex w-fit items-center gap-3 px-4 py-2.5">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FiCalendar size={16} />
                        </div>

                        <div>

                            <p className="ui-eyebrow">
                                Last Revision
                            </p>

                            <p className="mt-0.5 text-sm font-semibold text-ink">
                                {formatDateTime(
                                    detailedRevisions[0].updatedAt
                                )}
                            </p>

                        </div>

                    </div>
                )
            }
        />
    );

    if (loading) {
        return (
            <div className="h-full w-full p-8">
                <Loader text="Loading salary revisions..." />
            </div>
        );
    }

    if (!detailedRevisions.length) {
        return (
            <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

                {header}

                <div className="ui-card flex flex-col items-center justify-center px-6 py-14 text-center sm:py-20">

                    <div className="ui-tile h-16 w-16 bg-blue-50 text-blue-600">
                        <FiInbox size={28} />
                    </div>

                    <h2 className="mt-5 text-lg font-bold text-ink sm:text-xl">
                        No salary revisions yet
                    </h2>

                    <p className="mt-2 max-w-sm text-sm text-ink-subtle">
                        Revisions appear here once an existing salary
                        structure is updated for the first time.
                    </p>

                    <button
                        onClick={() => navigate("/salarydashboard/salary")}
                        className="ui-btn ui-btn-primary mt-6 font-semibold"
                    >
                        Go to Salaries
                    </button>

                </div>

            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            {header}

            {/* Filters */}
            <div className="ui-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <p className="text-sm text-ink-subtle">
                    Showing{" "}
                    <span className="font-semibold text-ink">
                        {visibleRevisions.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-ink">
                        {filteredRevisions.length}
                    </span>{" "}
                    revisions
                </p>

                <select
                    value={employeeFilter}
                    onChange={(e) =>
                        setEmployeeFilter(e.target.value)
                    }
                    className="ui-field w-full cursor-pointer font-medium sm:w-64"
                >
                    {employees.map((employee) => (
                        <option key={employee} value={employee}>
                            {employee === "All"
                                ? "All Employees"
                                : employee}
                        </option>
                    ))}
                </select>

            </div>

            {!filteredRevisions.length && (

                <div className="ui-card flex flex-col items-center justify-center px-6 py-14 text-center">

                    <div className="ui-tile h-16 w-16 bg-blue-50 text-blue-600">
                        <FiInbox size={28} />
                    </div>

                    <h2 className="mt-5 text-lg font-bold text-ink sm:text-xl">
                        No matching revisions
                    </h2>

                    <p className="mt-2 max-w-sm text-sm text-ink-subtle">
                        Try a different employee or search term.
                    </p>

                </div>

            )}

            {/* Revisions */}
            <div className="space-y-4">

                {visibleRevisions.map((revision) => {

                    const isOpen = selectedId === revision.id;

                    const increased = revision.netDifference > 0;
                    const decreased = revision.netDifference < 0;

                    return (

                        <div
                            key={revision.id}
                            className={`ui-card relative overflow-hidden transition-all duration-300 ${isOpen
                                ? "border-blue-200 shadow-lg"
                                : "hover:shadow-lg"
                                }`}
                        >

                            {/* Top Border */}
                            <span
                                className={`absolute left-0 top-0 h-1 w-full transition-colors duration-300 ${isOpen ? "bg-blue-500" : "bg-line"
                                    }`}
                            />

                            {/* Card Header */}
                            <button
                                type="button"
                                onClick={() => toggleRevision(revision.id)}
                                aria-expanded={isOpen}
                                className="flex w-full cursor-pointer flex-col gap-4 p-6 text-left lg:flex-row lg:items-center lg:justify-between"
                            >

                                <div className="flex items-center gap-3">

                                    <div className="ui-tile ui-tile-sm bg-blue-50 text-base font-bold text-blue-600">
                                        {revision.employeeName
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>

                                        <h2 className="ui-card-title">
                                            {revision.employeeName}
                                        </h2>

                                        <p className="mt-1 text-sm text-ink-subtle">
                                            {revision.employeeId} ·{" "}
                                            {revision.department}
                                        </p>

                                    </div>

                                </div>

                                <div className="flex flex-wrap items-center gap-3">

                                    {/*
                                    | A date and a name read worse in the
                                    | badge's small caps than they do as
                                    | written, so the metadata chips keep the
                                    | pill shape and leave `.ui-badge` to the
                                    | net change beside them.
                                    */}
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">
                                        Revision #{revision.revisionNumber}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">

                                        <FiCalendar size={12} />

                                        {formatDateTime(revision.updatedAt)}

                                    </span>

                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium capitalize text-ink-muted">

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
                                                : "bg-surface-muted text-ink-muted"
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
                                        {formatCurrency(revision.netDifference)}{" "}
                                        net

                                    </span>

                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">

                                        {revision.changes.length}{" "}
                                        {revision.changes.length === 1
                                            ? "change"
                                            : "changes"}

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

                                    <div className="border-t border-line-subtle px-6 pb-6">

                                        {!revision.changes.length ? (

                                            <p className="pt-5 text-sm text-ink-subtle">
                                                No field level differences were
                                                recorded for this revision.
                                            </p>

                                        ) : (

                                            <div className="mt-5 space-y-5">

                                                {revision.sections.map((section) => (

                                                    <div
                                                        key={section.group}
                                                        className="overflow-hidden rounded-xl border border-line"
                                                    >

                                                        <div className="flex items-center justify-between border-b border-line-subtle bg-surface-muted/60 px-4 py-2.5">

                                                            <h3 className="text-sm font-bold text-ink">
                                                                {section.group}
                                                            </h3>

                                                            <span className="text-xs font-medium text-ink-faint">
                                                                {section.changes.length}{" "}
                                                                {section.changes.length === 1
                                                                    ? "change"
                                                                    : "changes"}
                                                            </span>

                                                        </div>

                                                        <div className="divide-y divide-line-subtle">

                                                            {section.changes.map((change) => {

                                                                const isCurrency =
                                                                    change.type === "currency";

                                                                const up =
                                                                    isCurrency &&
                                                                    change.difference > 0;

                                                                const down =
                                                                    isCurrency &&
                                                                    change.difference < 0;

                                                                return (

                                                                    <div
                                                                        key={change.key}
                                                                        className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
                                                                    >

                                                                        <span className="font-medium text-ink-muted">
                                                                            {change.label}
                                                                        </span>

                                                                        <div className="flex flex-wrap items-center gap-3">

                                                                            <span className="text-ink-faint line-through">
                                                                                {isCurrency
                                                                                    ? formatCurrency(change.from)
                                                                                    : change.from}
                                                                            </span>

                                                                            <FiArrowRight
                                                                                size={14}
                                                                                className="text-ink-faint"
                                                                            />

                                                                            <span className="font-semibold text-ink">
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
                                                                                    {formatCurrency(
                                                                                        change.difference
                                                                                    )}

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
                                        <div className="mt-6 flex flex-col gap-3 border-t border-line-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">

                                            <div className="flex items-center gap-3">

                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-subtle">
                                                    <FiUser size={16} />
                                                </div>

                                                <div>

                                                    <p className="text-xs capitalize text-ink-subtle">
                                                        Changed by ·{" "}
                                                        {revision.updatedBy?.role || "unknown"}
                                                    </p>

                                                    <p className="text-sm font-semibold text-ink">
                                                        {revision.updatedByName}
                                                        {revision.updatedBy?.employeeId
                                                            ? ` (${revision.updatedBy.employeeId})`
                                                            : ""}
                                                    </p>

                                                </div>

                                            </div>

                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/salarydashboard/salary/history/${revision.employeeId}`
                                                    )
                                                }
                                                className="ui-btn ui-btn-secondary w-fit font-semibold"
                                            >

                                                <BsClockHistory size={15} />

                                                View employee history

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    );

                })}

            </div>

            {visibleCount < filteredRevisions.length && (

                <div className="flex justify-center">

                    <button
                        onClick={() =>
                            setVisibleCount(
                                (count) => count + PAGE_SIZE
                            )
                        }
                        className="ui-btn ui-btn-secondary font-semibold"
                    >
                        Load more revisions
                    </button>

                </div>

            )}

        </div>
    );
}

export default SalaryRevisions;
