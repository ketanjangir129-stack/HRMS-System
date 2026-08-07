import { db } from "../../firebase/firebase"
import { ref, get, set, remove, update } from "firebase/database";
import { getEmployees } from "../EmployeeService";
import { getAllSalary } from "../SalaryService";
import { getMonthlyAttendanceSummaries } from "../attendanceServices/attendanceSummaryService";
import { calculatePayroll } from "../../utils/Payroll/Payrollcalculator";
import {
    PAYROLL_STATUS,
    PAYSLIP_MONTHS,
} from "../../utils/Payroll/payrollConstants";
import {
    getPayPeriod,
    getRecentPayrollMonths,
    isPayrollMonth,
    parsePayrollMonth,
} from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Service
|--------------------------------------------------------------------------
| The only place that talks to the payroll branch of the database.
|
| companies/{companyCode}/payroll/{YYYY-MM}/{employeeId}
|
| The month is the outer node because everything that reads this tree wants a
| month at a time: the dashboard shows one month for every employee, and a
| payslip is one employee for one month. The month is not stored on the
| record - it is the node the record lives in, and deriving it from there is
| the only way the two can never disagree.
|
| What is stored is a *snapshot*, not a set of references. The employee's
| name, the salary structure, the attendance counts and every figure the
| calculation produced are all written into the record. A payslip printed a
| year later has to show what was paid at the time, so it must not re-derive
| itself from a salary that has since been revised or a day of attendance
| that has since been corrected.
|
| That is also why nothing here recalculates on read. `generatePayroll` is
| the only thing that prices a month; every read hands back what it stored.
|--------------------------------------------------------------------------
*/

const payrollPath = (companyCode) =>
    `companies/${companyCode}/payroll`;

const monthPath = (companyCode, payrollMonth) =>
    `${payrollPath(companyCode)}/${payrollMonth}`;

const employeePath = (companyCode, payrollMonth, employeeId) =>
    `${monthPath(companyCode, payrollMonth)}/${employeeId}`;

/*
|--------------------------------------------------------------------------
| Reads
|--------------------------------------------------------------------------
*/

export const checkPayrollExists = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const snapshot = await get(
        ref(
            db,
            employeePath(companyCode, payrollMonth, employeeId)
        )
    );
    return snapshot.exists();
};

export const getPayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const snapshot = await get(
        ref(
            db,
            employeePath(companyCode, payrollMonth, employeeId)
        )
    );
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.val();
}

/*
| Every payroll of a month, keyed by employee id. One read, however many
| employees the month covers.
*/

export const getMonthlyPayroll = async (
    companyCode,
    payrollMonth
) => {

    if (!companyCode || !isPayrollMonth(payrollMonth)) return {};

    const snapshot = await get(
        ref(
            db,
            monthPath(companyCode, payrollMonth)
        )
    );

    return snapshot.exists() ? snapshot.val() : {};

};

/*
| The last few months of one employee's payroll, newest first, and only the
| months that were actually generated.
|
| This is what the payslip page is built on: it asks for the three months
| ending at the one being viewed, and gets back however many of them exist.
| The months are read in parallel because they are separate nodes, and there
| are only ever a handful of them.
*/

export const getPayrollHistory = async (
    companyCode,
    employeeId,
    payrollMonth,
    months = PAYSLIP_MONTHS
) => {

    const payrollMonths = getRecentPayrollMonths(payrollMonth, months);

    if (!companyCode || !employeeId || payrollMonths.length === 0) {
        return [];
    }

    const records = await Promise.all(
        payrollMonths.map((month) =>
            getPayroll(companyCode, month, employeeId)
        )
    );

    return records
        .map((payroll, index) => (
            payroll
                ? { ...payroll, payrollMonth: payrollMonths[index] }
                : null
        ))
        .filter(Boolean);

};

/*
|--------------------------------------------------------------------------
| Dashboard List
|--------------------------------------------------------------------------
| Every employee of the company alongside whether the month has been run for
| them, and what it came to when it was.
|
| Two reads for the whole table. This used to fire one existence check per
| employee, which is a request per head per month change.
*/

export const getEmployeesWithPayrollStatus = async (
    companyCode,
    payrollMonth
) => {

    const [employees, monthlyPayroll] = await Promise.all([
        getEmployees(companyCode),
        getMonthlyPayroll(companyCode, payrollMonth),
    ]);

    return Object.keys(employees || {}).map((employeeId) => {

        const employee = employees[employeeId];

        const payroll = monthlyPayroll?.[employeeId] || null;

        return {

            employeeId,

            name: employee.personalInfo?.name,

            department: employee.employmentInfo?.department,

            designation: employee.employmentInfo?.designation,

            payrollGenerated: Boolean(payroll),

            netPayable: payroll?.calculation?.netPayable ?? null,

            payrollStatus: payroll?.status || "",

        };

    });

};

/*
|--------------------------------------------------------------------------
| Snapshot
|--------------------------------------------------------------------------
| Firebase rejects `undefined`, so every field is written explicitly and
| every optional one falls back to an empty value.
*/

const buildPayrollSnapshot = ({
    employeeId,
    employee,
    salary,
    summary,
    payrollMonth,
    generatedBy,
}) => {

    const calculation = calculatePayroll(salary, summary);

    const { fromDate, toDate, payDate } = getPayPeriod(payrollMonth);

    return {

        employeeId,

        /*
        | Copied, not referenced: a payslip has to keep showing the department
        | and designation the employee held when they were paid.
        */
        employee: {
            name: employee?.personalInfo?.name || employeeId,
            email: employee?.personalInfo?.email || "",
            department: employee?.employmentInfo?.department || "",
            designation: employee?.employmentInfo?.designation || "",
            joiningDate: employee?.employmentInfo?.joiningDate || "",
            employeeType: employee?.employmentInfo?.employeeType || "",
            bankName: employee?.bankInfo?.bankName || "",
            accountNumber: employee?.bankInfo?.accountNumber || "",
        },

        /*
        | The structure as it stood on the day the month was run, so a later
        | revision cannot rewrite a payslip that has already been issued.
        */
        salary: {
            earnings: salary?.earnings || {},
            deductions: salary?.deductions || {},
            effectiveFrom: salary?.effectiveFrom || "",
        },

        attendanceSummary: summary,

        calculation,

        payPeriod: {
            fromDate,
            toDate,
            payDate,
        },

        status: PAYROLL_STATUS.GENERATED,

        generatedAt: Date.now(),

        generatedBy: {
            employeeId: generatedBy?.employeeId || "unknown",
            name: generatedBy?.name || "Unknown",
            role: generatedBy?.role || "unknown",
        },

    };

};

const savePayroll = async (
    companyCode,
    payrollMonth,
    payroll
) => {

    await set(
        ref(
            db,
            employeePath(companyCode, payrollMonth, payroll.employeeId)
        ),
        payroll
    );

    return payroll;

};

/*
|--------------------------------------------------------------------------
| Generate Payroll
|--------------------------------------------------------------------------
| Get the employees, get their salaries, get the month of attendance,
| calculate, and store the snapshot.
|
| `employeeIds` narrows it to one employee - or a handful - and leaving it out
| runs the whole company. Either way the reads are the same four, because a
| month of attendance and a year of holidays are single nodes and so are the
| employee and salary trees.
|
| An employee with no salary structure is skipped rather than paid nothing:
| there is no structure to price the month against, and writing a zero
| payslip would look exactly like a month they earned nothing.
|
| A month already generated is skipped too, unless `regenerate` is passed.
| Re-running by accident would restamp every snapshot with today's attendance,
| which is the one thing a snapshot exists to prevent.
*/

export const generatePayroll = async (
    companyCode,
    payrollMonth,
    generatedBy,
    {
        employeeIds = null,
        regenerate = false,
    } = {}
) => {

    const parsed = parsePayrollMonth(payrollMonth);

    if (!companyCode || !parsed) {
        return {
            success: false,
            message: "Select a valid payroll month.",
        };
    }

    const [employees, salaries, existing] = await Promise.all([
        getEmployees(companyCode),
        getAllSalary(companyCode),
        getMonthlyPayroll(companyCode, payrollMonth),
    ]);

    const salaryMap = {};

    salaries.forEach((salary) => {
        salaryMap[salary.employeeId] = salary;
    });

    /*
    | The employees this run covers: the ones asked for, or everybody on the
    | books. An id that is not an employee of this company is dropped here
    | rather than being written as a payroll for somebody who does not exist.
    */

    const targets = (employeeIds || Object.keys(employees || {}))
        .filter((employeeId) => Boolean(employees?.[employeeId]));

    if (targets.length === 0) {
        return {
            success: false,
            message: "No employees found for this payroll run.",
        };
    }

    const summaries = await getMonthlyAttendanceSummaries(
        companyCode,
        targets,
        parsed.year,
        parsed.month
    );

    const generated = [];
    const skipped = [];

    /*
    | Sequential on purpose. A payroll run writes one node per employee and
    | firing them all at once buys nothing but a burst of concurrent writes,
    | while a failure part way through is easier to report as "these were
    | generated, these were not".
    */

    for (const employeeId of targets) {

        if (existing?.[employeeId] && !regenerate) {
            skipped.push({
                employeeId,
                reason: "Payroll already generated for this month.",
            });
            continue;
        }

        const salary = salaryMap[employeeId];

        if (!salary) {
            skipped.push({
                employeeId,
                reason: "No salary structure assigned.",
            });
            continue;
        }

        try {

            const payroll = await savePayroll(
                companyCode,
                payrollMonth,
                buildPayrollSnapshot({
                    employeeId,
                    employee: employees[employeeId],
                    salary,
                    summary: summaries[employeeId],
                    payrollMonth,
                    generatedBy,
                })
            );

            generated.push(payroll);

        } catch (error) {

            console.error(
                `Failed to generate payroll for ${employeeId}:`,
                error
            );

            skipped.push({
                employeeId,
                reason: "Could not be saved.",
            });

        }

    }

    return {
        success: generated.length > 0,
        generated,
        skipped,
        message: buildRunMessage(generated.length, skipped),
    };

};

/*
| One employee, through the same path, so a single row and a whole month are
| never priced by two different pieces of code.
*/

export const generateEmployeePayroll = async (
    companyCode,
    payrollMonth,
    employeeId,
    generatedBy,
    { regenerate = false } = {}
) => {

    const result = await generatePayroll(
        companyCode,
        payrollMonth,
        generatedBy,
        {
            employeeIds: [employeeId],
            regenerate,
        }
    );

    if (result.generated?.length) {
        return {
            success: true,
            payroll: result.generated[0],
            message: "Payroll generated.",
        };
    }

    return {
        success: false,
        message:
            result.skipped?.[0]?.reason ||
            result.message ||
            "Payroll could not be generated.",
    };

};

const buildRunMessage = (generatedCount, skipped) => {

    if (generatedCount === 0) {
        return skipped.length
            ? "Nothing to generate. Every employee was skipped."
            : "Nothing to generate.";
    }

    const suffix =
        skipped.length > 0
            ? `, ${skipped.length} skipped`
            : "";

    return `Payroll generated for ${generatedCount} employee${generatedCount === 1 ? "" : "s"}${suffix}.`;

};

/*
|--------------------------------------------------------------------------
| Writes
|--------------------------------------------------------------------------
*/

export const markPayrollPaid = async (
    companyCode,
    payrollMonth,
    employeeId
) => {

    await update(
        ref(
            db,
            employeePath(companyCode, payrollMonth, employeeId)
        ),
        {
            status: PAYROLL_STATUS.PAID,
            paidAt: Date.now(),
        }
    );

    return { success: true };

};

export const deletePayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {

    await remove(
        ref(
            db,
            employeePath(companyCode, payrollMonth, employeeId)
        )
    );

    return { success: true };

};
