import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiTrendingUp, FiTrendingDown, FiCheck } from "react-icons/fi";
import { TbMoneybagEdit } from "react-icons/tb";
import { getEmployeeById } from "../../services/EmployeeService";
import { calculateSalary } from "../../utils/salary/calculateSalary"
import { createSalary, getSalary, editSalary } from "../../services/SalaryService";
import { EARNING_FIELDS, DEDUCTION_FIELDS } from "../../utils/salary/salaryFields";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import Loader from "../../components/common/Loader";
import useRoleAccess from "../../hooks/useRoleAccess";

function SalaryForm() {
    const { employeeId } = useParams();
    const { canAccessSection } = useRoleAccess();
    const [employee, setEmployee] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const companyCode =
        localStorage.getItem('companyCode');
    const currentUser =
        JSON.parse(localStorage.getItem("currentUser") || "null");

    // currentUser shape depends on the role:
    // owner       -> { role, name, email }
    // employee/HR -> full employee record (personalInfo / employmentInfo / account)
    const updatedBy = {
        employeeId:
            currentUser?.employmentInfo?.employeeId ||
            currentUser?.email ||
            "unknown",
        name:
            currentUser?.personalInfo?.name ||
            currentUser?.name ||
            "Unknown",
        role:
            currentUser?.account?.role ||
            currentUser?.role ||
            localStorage.getItem("role") ||
            "unknown",
    };

    const [earnings, setEarnings] = useState({
        basic: "",
        hra: "",
        da: "",
        conveyance: "",
        medical: "",
        specialAllowance: "",
        bonus: "",
    });

    const [deductions, setDeductions] = useState({
        pf: "",
        esi: "",
        professionalTax: "",
        incomeTax: "",
        loan: "",
        other: "",
    });

    const [summary, setSummary] = useState({
        grossSalary: 0,
        totalDeduction: 0,
        netSalary: 0,
    });
    // today's date in YYYY-MM-DD (same format as joiningDate)
    const getToday = () => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${now.getFullYear()}-${month}-${day}`;
    };

    // effective date belongs to the employee whose salary is being assigned/updated,
    // it is filled in once that employee is loaded
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [status, setStatus] = useState("Active");
    const salary = {
        employeeId,
        earnings,
        deductions,
        grossSalary: summary.grossSalary,
        totalDeduction: summary.totalDeduction,
        netSalary: summary.netSalary,
        effectiveFrom,
        status,
    }

    const loadEmployee = async () => {
        try {
            const data = await getEmployeeById(
                companyCode,
                employeeId
            );
            setEmployee(data);
            return data;
        } catch (error) {
            console.error(error);


        } finally {
            setLoading(false);
        }
    };
    const loadSalary = async (employeeData) => {

        // joining date of the employee this salary belongs to
        const joiningDate =
            employeeData?.employmentInfo?.joiningDate || "";

        const salary = await getSalary(
            companyCode,
            employeeId
        );

        if (!salary) {

            setEffectiveFrom(joiningDate);

            return;

        }

        setIsEditMode(true);

        setEarnings(salary.earnings);

        setDeductions(salary.deductions);

        setSummary({

            grossSalary: salary.grossSalary,

            totalDeduction: salary.totalDeduction,

            netSalary: salary.netSalary,

        });

        // a salary already exists, so this is a revision -
        // it takes effect from today, not from the joining date
        setEffectiveFrom(getToday());

        setStatus(
            salary.status
        );

    };

    const handleEarningChange = (e) => {

        const { name, value } = e.target;

        setEarnings((prev) => ({
            ...prev,
            [name]: value,
        }));

    };

    const handleDeductionChange = (e) => {

        const { name, value } = e.target;

        setDeductions((prev) => ({
            ...prev,
            [name]: value,
        }));

    };
    const handleSubmit = async () => {

        /*
        | The route is already guarded, but which of the two rights applies is
        | only known once the record has loaded: this one component serves both
        | /create and /edit, and `isEditMode` is what decides whether the click
        | assigns a new structure or revises an existing one.
        */
        const permission = isEditMode ? "salary.update" : "salary.create";

        if (!canAccessSection(permission)) {
            alert(
                isEditMode
                    ? "You are not allowed to update salaries."
                    : "You are not allowed to create salaries."
            );
            return;
        }

        try {

            if (isEditMode) {

                const result = await editSalary(
                    companyCode,
                    employeeId,
                    salary,
                    updatedBy
                );

                alert(result.message);

            }

            else {

                const result = await createSalary(

                    companyCode,

                    {

                        employeeId,

                        earnings,

                        deductions,

                        grossSalary:
                            summary.grossSalary,

                        totalDeduction:
                            summary.totalDeduction,

                        netSalary:
                            summary.netSalary,

                        effectiveFrom,

                        status,

                    }

                );

                alert(result.message);

            }
            navigate("/salarydashboard/salary");
        }
        catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        const salarySummary =
            calculateSalary(
                earnings, deductions
            );
        setSummary(salarySummary);
    }, [earnings, deductions]);

    useEffect(() => {
        const loadData = async () => {
            const employeeData = await loadEmployee();
            await loadSalary(employeeData);
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="h-full w-full p-8">
                <Loader text="Loading employee..." />
            </div>
        );
    };

    if (!employee) {
        return (
            <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

                <SalaryPageHeader
                    title="Salary Structure"
                    subtitle="Employee not found"
                    icon={<TbMoneybagEdit />}
                    backTo="/salarydashboard/salary"
                />

                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

                    <p className="text-slate-500">
                        We couldn't find an employee with the ID{" "}
                        <span className="font-semibold text-slate-700">
                            {employeeId}
                        </span>.
                    </p>

                </div>

            </div>
        );
    }

    // small read-only facts shown next to the employee name
    const employeeDetails = [
        {
            label: "Employee ID",
            value: employee.employmentInfo?.employeeId || "—",
        },
        {
            label: "Department",
            value: employee.employmentInfo?.department || "—",
        },
        {
            label: "Designation",
            value: employee.employmentInfo?.designation || "—",
        },
        {
            label: "Effective From",
            value: effectiveFrom || "—",
        },
    ];

    const summaryCards = [
        {
            title: "Gross Salary",
            value: summary.grossSalary,
            subtitle: "Total earnings",
            icon: <FiTrendingUp />,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            valueColor: "text-emerald-600",
            bar: "bg-emerald-500",
        },
        {
            title: "Total Deduction",
            value: summary.totalDeduction,
            subtitle: "Total deductions",
            icon: <FiTrendingDown />,
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
            valueColor: "text-red-600",
            bar: "bg-red-500",
        },
        {
            title: "Net Salary",
            value: summary.netSalary,
            subtitle: "Take home pay",
            icon: <TbMoneybagEdit />,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            valueColor: "text-blue-600",
            bar: "bg-blue-500",
        },
    ];

    const renderAmountField = (field, value, onChange) => (

        <div key={field.name}>

            <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-medium text-slate-700"
            >
                {field.label}
            </label>

            <div className="relative">

                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    ₹
                </span>

                <input
                    id={field.name}
                    type="number"
                    name={field.name}
                    value={value ?? ""}
                    onChange={onChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

            </div>

        </div>

    );

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            <SalaryPageHeader
                title={isEditMode ? "Update Salary" : "Assign Salary"}
                subtitle={
                    isEditMode
                        ? "Revise the existing salary structure"
                        : "Set up the salary structure for this employee"
                }
                icon={<TbMoneybagEdit />}
                backTo="/salarydashboard/salary"
                action={
                    <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium ${
                            isEditMode
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {isEditMode ? "Revision" : "New Structure"}
                    </span>
                }
            />

            {/* Employee Information */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex items-center gap-4">

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                            {(employee.personalInfo?.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <h2 className="text-lg font-semibold text-slate-900">
                                {employee.personalInfo?.name || "—"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Employee information
                            </p>

                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">

                        {employeeDetails.map((detail) => (

                            <div key={detail.label}>

                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    {detail.label}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {detail.value}
                                </p>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-5 flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FiTrendingUp size={20} />
                        </div>

                        <div>

                            <h2 className="text-lg font-semibold text-slate-900">
                                Earnings
                            </h2>

                            <p className="text-sm text-slate-500">
                                Salary components added to the gross pay
                            </p>

                        </div>

                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                        {EARNING_FIELDS.map((field) =>
                            renderAmountField(
                                field,
                                earnings[field.name],
                                handleEarningChange
                            )
                        )}

                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">

                        <span className="text-sm font-medium text-emerald-700">
                            Gross Salary
                        </span>

                        <span className="text-base font-bold text-emerald-700">
                            {formatCurrency(summary.grossSalary)}
                        </span>

                    </div>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-5 flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <FiTrendingDown size={20} />
                        </div>

                        <div>

                            <h2 className="text-lg font-semibold text-slate-900">
                                Deductions
                            </h2>

                            <p className="text-sm text-slate-500">
                                Amounts subtracted from the gross pay
                            </p>

                        </div>

                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                        {DEDUCTION_FIELDS.map((field) =>
                            renderAmountField(
                                field,
                                deductions[field.name],
                                handleDeductionChange
                            )
                        )}

                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">

                        <span className="text-sm font-medium text-red-700">
                            Total Deduction
                        </span>

                        <span className="text-base font-bold text-red-700">
                            {formatCurrency(summary.totalDeduction)}
                        </span>

                    </div>

                </div>

            </div>

            {/* Salary Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                    Salary Summary
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

                    {summaryCards.map((card) => (

                        <div
                            key={card.title}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >

                            <span
                                className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
                            />

                            <div className="flex items-start justify-between gap-3">

                                <div>

                                    <p className="text-sm font-medium text-slate-500">
                                        {card.title}
                                    </p>

                                    <h3
                                        className={`mt-2 text-2xl font-bold ${card.valueColor}`}
                                    >
                                        {formatCurrency(card.value)}
                                    </h3>

                                    <p className="mt-2 text-xs font-medium text-slate-400">
                                        {card.subtitle}
                                    </p>

                                </div>

                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition group-hover:scale-110 ${card.iconBg} ${card.iconColor}`}
                                >
                                    {card.icon}
                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <p className="text-sm text-slate-500">
                    {isEditMode
                        ? "The current structure is saved to salary history before it is replaced."
                        : "Review the amounts before assigning the salary."}
                </p>

                <div className="flex items-center gap-3">

                    <button
                        onClick={() => navigate("/salarydashboard/salary")}
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
                    >

                        <FiCheck
                            size={18}
                            className="transition-transform duration-200 group-hover:scale-110"
                        />

                        {isEditMode ? "Update Salary" : "Assign Salary"}

                    </button>

                </div>

            </div>

        </div>
    )
}

export default SalaryForm;
