import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiTrendingUp,
    FiTrendingDown,
    FiCalendar,
    FiUser,
    FiInbox,
    FiChevronDown,
} from "react-icons/fi";
import { BsClockHistory } from "react-icons/bs";
import { TbMoneybagEdit } from "react-icons/tb";
import { getSalaryHistory } from "../../services/SalaryService";
import { getFieldLabel } from "../../utils/salary/salaryFields";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import { formatSalaryDate } from "../../utils/salary/formatSalaryDate";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import Loader from "../../components/common/Loader";

function SalaryHistory() {
    const { employeeId } = useParams();
    const companyCode = localStorage.getItem("companyCode");
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);

    const toggleRevision = (id) => {
        setSelectedId((current) => (current === id ? null : id));
    };

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await getSalaryHistory(
                companyCode,
                employeeId
            );
            setHistory(data);
        }
        catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadHistory();
    }, []);

    const header = (
        <SalaryPageHeader
            title="Salary History"
            subtitle={`Revision timeline for employee ${employeeId}`}
            icon={<BsClockHistory />}
            backTo="/salarydashboard"
            /* The count is small enough to sit beside the title on a phone. */
            inlineAction
            action={
                history.length > 0 && (
                    <span className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 sm:px-3 sm:text-sm">
                        {history.length}{" "}
                        {history.length === 1 ? "revision" : "revisions"}
                    </span>
                )
            }
        />
    );

    if (loading) {
        return (
            <div className="h-full w-full p-8">
                <Loader text="Loading salary history..." />
            </div>
        );
    }

    if (!history.length) {
        return (
            <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

                {header}

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FiInbox size={26} />
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-slate-900">
                        No salary history yet
                    </h2>

                    <p className="mt-1 max-w-md text-sm text-slate-500">
                        Revisions appear here once this employee's salary
                        structure is updated for the first time.
                    </p>

                    <button
                        onClick={() => navigate("/salarydashboard")}
                        className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
                    >
                        Back to Salaries
                    </button>

                </div>

            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            {header}

            <div className="space-y-4">

                {history.map((record, index) => {

                    const amounts = [
                        {
                            title: "Gross Salary",
                            value: record.grossSalary,
                            icon: <FiTrendingUp />,
                            iconBg: "bg-emerald-50",
                            iconColor: "text-emerald-600",
                            valueColor: "text-emerald-600",
                        },
                        {
                            title: "Total Deduction",
                            value: record.totalDeduction,
                            icon: <FiTrendingDown />,
                            iconBg: "bg-red-50",
                            iconColor: "text-red-600",
                            valueColor: "text-red-600",
                        },
                        {
                            title: "Net Salary",
                            value: record.netSalary,
                            icon: <TbMoneybagEdit />,
                            iconBg: "bg-blue-50",
                            iconColor: "text-blue-600",
                            valueColor: "text-blue-600",
                        },
                    ];

                    const isOpen = selectedId === record.id;

                    return (

                        <div
                            key={record.id}
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
                                onClick={() => toggleRevision(record.id)}
                                aria-expanded={isOpen}
                                className="flex w-full cursor-pointer flex-col gap-4 p-6 text-left md:flex-row md:items-center md:justify-between"
                            >

                                <div className="flex items-center gap-3">

                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${isOpen
                                                ? "bg-blue-50 text-blue-600"
                                                : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        <BsClockHistory size={20} />
                                    </div>

                                    <div>

                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Salary Revision #{history.length - index}
                                        </h2>

                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">

                                            <FiCalendar size={14} />

                                            Recorded on {formatSalaryDate(record.updatedAt)}

                                        </p>

                                    </div>

                                </div>

                                <div className="flex flex-wrap items-center gap-3">

                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                        Effective from {record.effectiveFrom || "—"}
                                    </span>

                                    <span
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${record.status === "Active"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                            }`}
                                    >
                                        {record.status || "—"}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">

                                        {isOpen ? "Hide details" : "View details"}

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

                                    <div className="border-t border-slate-100 px-6 pb-6">

                                        {/* Amounts */}
                                        <div className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">

                                            {amounts.map((amount) => (

                                                <div
                                                    key={amount.title}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                                                >

                                                    <div>

                                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                            {amount.title}
                                                        </p>

                                                        <p
                                                            className={`mt-1.5 text-xl font-bold ${amount.valueColor}`}
                                                        >
                                                            {formatCurrency(amount.value)}
                                                        </p>

                                                    </div>

                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${amount.iconBg} ${amount.iconColor}`}
                                                    >
                                                        {amount.icon}
                                                    </div>

                                                </div>

                                            ))}

                                        </div>

                                        {/* Breakdown */}
                                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

                                            <div className="rounded-xl border border-slate-200 p-5">

                                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">

                                                    <FiTrendingUp className="text-emerald-600" />

                                                    Earnings

                                                </h3>

                                                <div className="space-y-1">

                                                    {Object.entries(record.earnings || {}).map(
                                                        ([key, value]) => (

                                                            <div
                                                                key={key}
                                                                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50"
                                                            >

                                                                <span className="text-slate-500">
                                                                    {getFieldLabel(key)}
                                                                </span>

                                                                <span className="font-semibold text-slate-800">
                                                                    {formatCurrency(value)}
                                                                </span>

                                                            </div>

                                                        )
                                                    )}

                                                </div>

                                            </div>

                                            <div className="rounded-xl border border-slate-200 p-5">

                                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">

                                                    <FiTrendingDown className="text-red-600" />

                                                    Deductions

                                                </h3>

                                                <div className="space-y-1">

                                                    {Object.entries(record.deductions || {}).map(
                                                        ([key, value]) => (

                                                            <div
                                                                key={key}
                                                                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50"
                                                            >

                                                                <span className="text-slate-500">
                                                                    {getFieldLabel(key)}
                                                                </span>

                                                                <span className="font-semibold text-slate-800">
                                                                    {formatCurrency(value)}
                                                                </span>

                                                            </div>

                                                        )
                                                    )}

                                                </div>

                                            </div>

                                        </div>

                                        {/* Footer */}
                                        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">

                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                                <FiUser size={16} />
                                            </div>

                                            <div>
                                                <p className="text-xs capitalize text-slate-500">
                                                    Updated by · {record.updatedBy?.role || "unknown"}
                                                </p>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {record.updatedBy?.name || "Unknown"}
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    );

                })}

            </div>

        </div>
    )
}

export default SalaryHistory;
