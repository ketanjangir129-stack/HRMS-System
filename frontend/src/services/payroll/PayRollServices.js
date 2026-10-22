import {
    getPayrollRunApi,
    getMonthlyPayrollApi,
    getEmployeesWithPayrollStatusApi,
    getEmployeePayrollMonthsApi,
    getPayrollHistoryApi,
    getPayrollApi,
    isPayrollMonthLockedApi,
    generatePayrollApi,
    approvePayrollApi,
    lockPayrollApi,
    markPayrollPaidApi,
    deletePayrollApi,
} from "../api/payrollApi";
import { PAYSLIP_MONTHS } from "../../utils/Payroll/payrollConstants";

/*
|--------------------------------------------------------------------------
| Payroll Service
|--------------------------------------------------------------------------
| Thin client over the backend payroll API (`/api/payroll`). Every figure —
| attendance summaries, loss of pay, overtime, run totals — is calculated
| server-side; nothing here reads Firebase directly anymore.
|
| Company comes from the auth token, so `companyCode` is kept on every
| signature for call-site compatibility only. Return shapes are unchanged,
| so the dashboard, payslip and my-payroll screens work as before.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Reads
|--------------------------------------------------------------------------
*/

export const getPayrollRun = async (companyCode, payrollMonth) => {
    const result = await getPayrollRunApi(payrollMonth);

    if (result?.success) {
        return result.data ?? null;
    }

    throw new Error(result?.message || "Failed to fetch payroll run.");
};

export const getMonthlyPayroll = async (companyCode, payrollMonth) => {
    const result = await getMonthlyPayrollApi(payrollMonth);

    if (result?.success) {
        return result.data ?? {};
    }

    throw new Error(result?.message || "Failed to fetch payroll records.");
};

export const getPayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const result = await getPayrollApi(payrollMonth, employeeId);

    if (result?.success) {
        return result.data ?? null;
    }

    if (result?.code === "PAYROLL_NOT_FOUND") {
        return null;
    }

    throw new Error(result?.message || "Failed to fetch payroll.");
};

/*
| One employee's payroll across a span of months, each month with its run
| attached. Used by My Payroll (financial year) and underlies the payslip
| history below.
*/
export const getEmployeePayrollMonths = async (
    companyCode,
    employeeId,
    payrollMonths = []
) => {
    const result = await getEmployeePayrollMonthsApi(employeeId, payrollMonths);

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to fetch employee payroll.");
};

export const getPayrollHistory = async (
    companyCode,
    employeeId,
    payrollMonth,
    months = PAYSLIP_MONTHS
) => {
    const result = await getPayrollHistoryApi(employeeId, payrollMonth, months);

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to fetch payroll history.");
};

/*
|--------------------------------------------------------------------------
| Dashboard List
|--------------------------------------------------------------------------
| Every employee of the company alongside whether the month has been run for
| them and what it came to, and the run the month itself is in.
*/
export const getEmployeesWithPayrollStatus = async (
    companyCode,
    payrollMonth
) => {
    const result = await getEmployeesWithPayrollStatusApi(payrollMonth);

    if (result?.success) {
        return result.data ?? { employees: [], run: null };
    }

    throw new Error(result?.message || "Failed to fetch payroll status.");
};

/*
|--------------------------------------------------------------------------
| Generate Payroll
|--------------------------------------------------------------------------
| Price a month — whole company, or narrowed to `employeeIds`. An employee
| with no salary structure is skipped, and a month already generated is
| skipped too unless `regenerate` is passed.
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
    // The actor stamp is built server-side from the auth token;
    // generatedBy is kept for call-site compatibility.
    const result = await generatePayrollApi({
        payrollMonth,
        employeeIds,
        regenerate,
    });

    if (result?.success) {
        const data = result.data ?? {};

        return {
            success: true,
            generated: data.generated ?? [],
            skipped: data.skipped ?? [],
            run: data.run ?? null,
            message: result.message || "Payroll generated.",
        };
    }

    return {
        success: false,
        generated: result?.data?.generated ?? [],
        skipped: result?.data?.skipped ?? [],
        message: result?.message || "Payroll could not be generated.",
    };
};

/*
| One employee, through the same endpoint, so a single row and a whole month
| are never priced by two different pieces of code.
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
            run: result.run,
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

/*
|--------------------------------------------------------------------------
| Approve And Lock
|--------------------------------------------------------------------------
| The two steps that close a month. Neither recalculates anything — the
| figures being approved are the ones that were generated.
*/
export const approvePayroll = async (companyCode, payrollMonth, approvedBy) => {
    const result = await approvePayrollApi(payrollMonth);

    if (result?.success) {
        return {
            success: true,
            run: result.data?.run ?? null,
            message: result.message || "Payroll approved. It is now closed to changes.",
        };
    }

    return {
        success: false,
        message: result?.message || "Payroll could not be approved.",
    };
};

export const lockPayroll = async (companyCode, payrollMonth, lockedBy) => {
    const result = await lockPayrollApi(payrollMonth);

    if (result?.success) {
        return {
            success: true,
            run: result.data?.run ?? null,
            message: result.message || "Payroll locked. This month is now final.",
        };
    }

    return {
        success: false,
        message: result?.message || "Payroll could not be locked.",
    };
};

/*
|--------------------------------------------------------------------------
| Writes
|--------------------------------------------------------------------------
| Everything that changes a month after it has been generated. The backend
| refuses all of them on a locked month.
*/
export const markPayrollPaid = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const result = await markPayrollPaidApi(payrollMonth, employeeId);

    if (result?.success) {
        return { success: true, message: result.message || "Marked as paid." };
    }

    return {
        success: false,
        message: result?.message || "Could not mark payroll as paid.",
    };
};

/*
| Removing one employee's snapshot re-totals the month server-side.
*/
export const deletePayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const result = await deletePayrollApi(payrollMonth, employeeId);

    if (result?.success) {
        return { success: true, message: result.message || "Payroll deleted." };
    }

    return {
        success: false,
        message: result?.message || "Could not delete payroll.",
    };
};

/*
| Whether a month may still be written to at all, for a caller that holds a
| month rather than a run.
*/
export const isPayrollMonthLocked = async (companyCode, payrollMonth) => {
    const result = await isPayrollMonthLockedApi(payrollMonth);

    if (result?.success) {
        return Boolean(result.data?.locked);
    }

    throw new Error(result?.message || "Failed to check payroll lock.");
};
