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

/*
| What may be typed into a money field.
|
| The amount fields are text inputs rather than number ones, so the browser
| leaves out the stepper arrows it puts on a number input - nobody sets a
| salary by clicking up forty thousand times, and a scroll wheel over a
| focused field silently changes the amount.
|
| Dropping the number type also drops the browser's filtering, so it is done
| here instead: digits and a single decimal point survive and everything else
| is discarded as it is typed. Without this a stray letter would sit in the
| field looking like part of the amount, and be priced as zero.
|
| The value stays the string that was typed rather than being parsed. "12."
| and "" are both mid-edit states that a number cannot hold, and parsing on
| every keystroke would delete the decimal point the moment it was entered.
*/

const toAmountInput = (value) => {

    const cleaned = String(value ?? "").replace(/[^\d.]/g, "");

    const [whole, ...rest] = cleaned.split(".");

    // Only the first decimal point is a decimal point; "1.2.3" is 1.23.
    return rest.length ? `${whole}.${rest.join("")}` : whole;

};

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
            [name]: toAmountInput(value),
        }));

    };

    const handleDeductionChange = (e) => {

        const { name, value } = e.target;

        setDeductions((prev) => ({
            ...prev,
            [name]: toAmountInput(value),
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
                    backLabel="Salaries"
                />

                <div className="ui-card p-10 text-center">

                    <p className="text-sm text-ink-subtle">
                        We couldn't find an employee with the ID{" "}
                        <span className="font-semibold text-ink">
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

    /*
    | The figure is set in ink and the hue is carried by the tile and the bar
    | above it, the way the dashboard's stat cards are drawn.
    */
    const summaryCards = [
        {
            title: "Gross Salary",
            value: summary.grossSalary,
            subtitle: "Total earnings",
            icon: <FiTrendingUp />,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            bar: "bg-emerald-500",
        },
        {
            title: "Total Deduction",
            value: summary.totalDeduction,
            subtitle: "Total deductions",
            icon: <FiTrendingDown />,
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
            bar: "bg-red-500",
        },
        {
            title: "Net Salary",
            value: summary.netSalary,
            subtitle: "Take home pay",
            icon: <TbMoneybagEdit />,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            bar: "bg-blue-500",
        },
    ];

    const renderAmountField = (field, value, onChange) => (

        <div key={field.name}>

            <label htmlFor={field.name} className="ui-label">
                {field.label}
            </label>

            <div className="relative">

                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-faint">
                    ₹
                </span>

                <input
                    id={field.name}
                    type="text"
                    /*
                    | The field is text so it carries no stepper arrows, but
                    | it still holds a number: `inputMode` is what puts a
                    | phone's numeric keypad up rather than its alphabet.
                    */
                    inputMode="decimal"
                    autoComplete="off"
                    name={field.name}
                    value={value ?? ""}
                    onChange={onChange}
                    placeholder="0"
                    /*
                    | `pl-8` after the kit class, not instead of it: the utility
                    | is emitted later in the cascade, so it only moves the text
                    | clear of the ₹ and leaves the rest of the field alone.
                    */
                    className="ui-field pl-8"
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
                backLabel="Salaries"
                action={
                    <span
                        className={`ui-badge ${
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
            <div className="ui-card ui-card-body">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex items-center gap-4">

                        <div className="ui-tile h-14 w-14 bg-blue-50 text-xl font-bold text-blue-600">
                            {(employee.personalInfo?.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <h2 className="ui-card-title">
                                {employee.personalInfo?.name || "—"}
                            </h2>

                            <p className="ui-card-subtitle">
                                Employee information
                            </p>

                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">

                        {employeeDetails.map((detail) => (

                            <div key={detail.label}>

                                <p className="ui-eyebrow">
                                    {detail.label}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-ink">
                                    {detail.value}
                                </p>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">

                <div className="ui-card ui-card-body">

                    <div className="mb-5 flex items-center gap-3">

                        <div className="ui-tile ui-tile-sm bg-emerald-50 text-emerald-600">
                            <FiTrendingUp size={20} />
                        </div>

                        <div>

                            <h2 className="ui-card-title">
                                Earnings
                            </h2>

                            <p className="ui-card-subtitle">
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

                <div className="ui-card ui-card-body">

                    <div className="mb-5 flex items-center gap-3">

                        <div className="ui-tile ui-tile-sm bg-red-50 text-red-600">
                            <FiTrendingDown size={20} />
                        </div>

                        <div>

                            <h2 className="ui-card-title">
                                Deductions
                            </h2>

                            <p className="ui-card-subtitle">
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
            <div className="ui-card ui-card-body">

                <h2 className="ui-card-title mb-5">
                    Salary Summary
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">

                    {summaryCards.map((card) => (

                        <div
                            key={card.title}
                            className="ui-card ui-card-interactive group relative overflow-hidden p-4 sm:p-6"
                        >

                            <span
                                className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
                            />

                            <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">

                                    <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                                        {card.title}
                                    </p>

                                    <h3 className="mt-1 text-2xl font-bold text-ink sm:mt-2 sm:text-3xl">
                                        {formatCurrency(card.value)}
                                    </h3>

                                    <p className="mt-2 text-[11px] font-medium text-ink-subtle sm:text-xs">
                                        {card.subtitle}
                                    </p>

                                </div>

                                <div
                                    className={`ui-tile h-10 w-10 text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor}`}
                                >
                                    {card.icon}
                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

            {/* Actions */}
            <div className="ui-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <p className="text-sm text-ink-subtle">
                    {isEditMode
                        ? "The current structure is saved to salary history before it is replaced."
                        : "Review the amounts before assigning the salary."}
                </p>

                <div className="flex items-center gap-3">

                    <button
                        onClick={() => navigate("/salarydashboard/salary")}
                        className="ui-btn ui-btn-secondary font-semibold"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        className="ui-btn ui-btn-primary group font-semibold"
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
