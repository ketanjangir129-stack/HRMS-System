import { db } from "../../firebase/firebase"
import { ref, get, set, remove, update } from "firebase/database";
import { getEmployees } from "../EmployeeService";
import { getAllSalary } from "../SalaryService";
import { getMonthlyAttendanceSummaries } from "../attendanceServices/attendanceSummaryService";
import { calculatePayroll } from "../../utils/Payroll/Payrollcalculator";
import {
    PAYROLL_RECORDS_NODE,
    PAYROLL_RUN_STATUS,
    PAYROLL_RUNS_NODE,
    PAYROLL_STATUS,
    PAYSLIP_MONTHS,
} from "../../utils/Payroll/payrollConstants";
import {
    buildRunTotals,
    canApproveRun,
    canEditRun,
    canGenerateRun,
    canLockRun,
    isRunLocked,
} from "../../utils/Payroll/payrollRun";
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
| companies/{companyCode}/payroll/runs/{YYYY-MM}
| companies/{companyCode}/payroll/records/{YYYY-MM}/{employeeId}
|
| The month is the node rather than a field on the record, because everything
| that reads this tree wants a month at a time: the dashboard shows one month
| for every employee, and a payslip is one employee for one month. Deriving
| the month from where the record lives is the only way the two can never
| disagree.
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
| A salary revised in March, an attendance day corrected in April and a
| holiday declared afterwards all leave February's payroll exactly as it was.
|
| The run is the month's own record: its totals, and where it has got to in
| the generate, approve, lock sequence. Every write below asks the run for
| permission first, which is what makes a locked month final - there is no
| path through this file that writes to a month whose run says locked.
|--------------------------------------------------------------------------
*/

const payrollPath = (companyCode) =>
    `companies/${companyCode}/payroll`;

const runPath = (companyCode, payrollMonth) =>
    `${payrollPath(companyCode)}/${PAYROLL_RUNS_NODE}/${payrollMonth}`;

const recordsPath = (companyCode, payrollMonth) =>
    `${payrollPath(companyCode)}/${PAYROLL_RECORDS_NODE}/${payrollMonth}`;

const recordPath = (companyCode, payrollMonth, employeeId) =>
    `${recordsPath(companyCode, payrollMonth)}/${employeeId}`;

/*
| Where a month of payroll was filed before runs and records were split apart.
|
| Reads fall back to it so a company that generated payroll under the old
| shape keeps its payslips; writes never go near it, so a month re-run after
| the split moves itself into the new tree. `runs` and `records` can never be
| mistaken for one of these, because neither is a `YYYY-MM` and every path
| below is built from a month that has been validated.
*/

const legacyMonthPath = (companyCode, payrollMonth) =>
    `${payrollPath(companyCode)}/${payrollMonth}`;

const readValue = async (path) => {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
};

/*
|--------------------------------------------------------------------------
| Reads
|--------------------------------------------------------------------------
*/

export const getPayrollRun = async (companyCode, payrollMonth) => {

    if (!companyCode || !isPayrollMonth(payrollMonth)) return null;

    return readValue(runPath(companyCode, payrollMonth));

};

/*
| Every record of a month, keyed by employee id, and where they were found.
| One read, however many employees the month covers; a second only when the
| month has nothing under the new shape and might be an old one.
|
| The two are never merged. A month is entirely in one shape or entirely in
| the other, because the first write to an old month moves the whole thing
| across before it adds anything - see `migrateLegacyRecords`. Merging would
| be the alternative, and it would mean two reads of every month forever.
*/

const readMonthRecords = async (companyCode, payrollMonth) => {

    if (!companyCode || !isPayrollMonth(payrollMonth)) {
        return { records: {}, legacy: false };
    }

    const records = await readValue(
        recordsPath(companyCode, payrollMonth)
    );

    if (records) return { records, legacy: false };

    const legacyRecords = await readValue(
        legacyMonthPath(companyCode, payrollMonth)
    );

    return {
        records: legacyRecords || {},
        legacy: Boolean(legacyRecords),
    };

};

export const getMonthlyPayroll = async (companyCode, payrollMonth) =>
    (await readMonthRecords(companyCode, payrollMonth)).records;

/*
| The whole month moved into the records node, the first time anything is
| written to a month that predates the split.
|
| It happens before the write that triggered it rather than after, so the
| write lands on top of a month that is already in one place. Doing it the
| other way round - writing the new record and leaving the rest behind -
| would make the month half of each, and the fallback read above returns one
| shape or the other, so the employees left behind would vanish from it.
*/

const migrateLegacyRecords = async (
    companyCode,
    payrollMonth,
    records
) => {

    await set(
        ref(db, recordsPath(companyCode, payrollMonth)),
        records
    );

    await remove(
        ref(db, legacyMonthPath(companyCode, payrollMonth))
    );

};

export const getPayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {

    if (!companyCode || !employeeId || !isPayrollMonth(payrollMonth)) {
        return null;
    }

    const record = await readValue(
        recordPath(companyCode, payrollMonth, employeeId)
    );

    if (record) return record;

    return readValue(
        `${legacyMonthPath(companyCode, payrollMonth)}/${employeeId}`
    );

}

/*
| The month's run and its records together, which is what every write needs:
| the run to ask whether the write is allowed, and the records to re-total
| the run afterwards.
|
| A month generated before runs existed has records but no run node. Rather
| than refusing to approve it, a run is folded out of the records it already
| has - generated, by nobody the record remembers - so an old month can still
| be taken through the sequence. It is not written until something happens to
| the month, so reading a legacy month does not quietly create one.
*/

const readRunState = async (companyCode, payrollMonth) => {

    const [run, { records, legacy }] = await Promise.all([
        getPayrollRun(companyCode, payrollMonth),
        readMonthRecords(companyCode, payrollMonth),
    ]);

    if (run) return { run, records, legacy };

    if (Object.keys(records).length === 0) {
        return { run: null, records, legacy };
    }

    return {
        run: {
            payrollMonth,
            status: PAYROLL_RUN_STATUS.GENERATED,
            ...buildRunTotals(records),
            /*
            | Zero rather than a guess. The old shape stamped each record with
            | who generated it but never the month, and inventing a date here
            | would put a time on the run that nothing actually recorded. It
            | is also what tells `advanceRun` this run has never been written.
            */
            generatedAt: 0,
            generatedBy: null,
        },
        records,
        legacy,
    };

};

/*
| The last few months of one employee's payroll, newest first, and only the
| months that were actually generated.
|
| This is what the payslip page is built on: it asks for the three months
| ending at the one being viewed, and gets back however many of them exist.
| The months are read in parallel because they are separate nodes, and there
| are only ever a handful of them.
|
| Each month arrives with its run attached. A payslip is only released once
| its month is locked, and the page cannot tell whether it is without the run
| - the record's own status says "Generated" whether the month was closed or
| not, because that is a fact about the record and locking is a fact about
| the month.
|
| The run is read for a month even when there is no record in it. Skipping
| those would mean waiting for the record before knowing whether to ask, and
| the whole point of reading them together is one round trip rather than two.
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

    const entries = await Promise.all(
        payrollMonths.map(async (month) => {

            const [payroll, run] = await Promise.all([
                getPayroll(companyCode, month, employeeId),
                getPayrollRun(companyCode, month),
            ]);

            return payroll
                ? { ...payroll, payrollMonth: month, run }
                : null;

        })
    );

    return entries.filter(Boolean);

};

/*
|--------------------------------------------------------------------------
| Dashboard List
|--------------------------------------------------------------------------
| Every employee of the company alongside whether the month has been run for
| them and what it came to, and the run the month itself is in.
|
| Three reads for the whole page, whatever the headcount.
*/

export const getEmployeesWithPayrollStatus = async (
    companyCode,
    payrollMonth
) => {

    const [employees, { run, records }] = await Promise.all([
        getEmployees(companyCode),
        readRunState(companyCode, payrollMonth),
    ]);

    const rows = Object.keys(employees || {}).map((employeeId) => {

        const employee = employees[employeeId];

        const payroll = records?.[employeeId] || null;

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

    return { employees: rows, run };

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

/*
|--------------------------------------------------------------------------
| Run
|--------------------------------------------------------------------------
| The month's own record, rewritten whenever its records change.
|
| The totals are folded out of the records that are about to be stored rather
| than summed on read, so the figure the run reports is the figure the month
| was closed on. A record corrected afterwards cannot move it, which is the
| whole point of writing it down.
|
| The approval and lock stamps are carried through untouched. In practice a
| month past either state refuses every write that would reach here, but the
| run is rewritten in full rather than patched, and a rewrite that dropped
| them would quietly reopen a closed month.
*/

const writeRun = async (
    companyCode,
    payrollMonth,
    { run, records, generatedBy }
) => {

    const stamped = {

        payrollMonth,

        status: run?.status || PAYROLL_RUN_STATUS.GENERATED,

        ...buildRunTotals(records),

        /*
        | The first run of the month is the one the month is dated by. A
        | later pass that fills in a missed employee is still the same run.
        */
        generatedAt: run?.generatedAt || Date.now(),

        generatedBy: run?.generatedBy || generatedBy || null,

        approvedAt: run?.approvedAt || null,
        approvedBy: run?.approvedBy || null,

        lockedAt: run?.lockedAt || null,
        lockedBy: run?.lockedBy || null,

    };

    await set(ref(db, runPath(companyCode, payrollMonth)), stamped);

    return stamped;

};

/*
|--------------------------------------------------------------------------
| Generate Payroll
|--------------------------------------------------------------------------
| Get the employees, get their salaries, get the month of attendance,
| calculate, store a snapshot each, and re-total the run.
|
| `employeeIds` narrows it to one employee - or a handful - and leaving it out
| runs the whole company. Either way the reads are the same handful, because
| a month of attendance and a year of holidays are single nodes and so are
| the employee and salary trees.
|
| An employee with no salary structure is skipped rather than paid nothing:
| there is no structure to price the month against, and writing a zero
| payslip would look exactly like a month they earned nothing.
|
| A month already generated is skipped too, unless `regenerate` is passed.
| Re-running by accident would restamp every snapshot with today's attendance,
| which is the one thing a snapshot exists to prevent.
|
| A month that has been approved or locked refuses the whole run before it
| reads anything. That is checked here as well as on the buttons, because the
| dashboard's copy of the run is as old as its last load and a month can be
| approved by somebody else while it is on screen.
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

    const [employees, salaries, { run, records, legacy }] = await Promise.all([
        getEmployees(companyCode),
        getAllSalary(companyCode),
        readRunState(companyCode, payrollMonth),
    ]);

    const allowed = canGenerateRun(run);

    if (!allowed.allowed) {
        return {
            success: false,
            generated: [],
            skipped: [],
            message: allowed.reason,
        };
    }

    if (legacy) {
        await migrateLegacyRecords(companyCode, payrollMonth, records);
    }

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
            generated: [],
            skipped: [],
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
    | The month's records as they will stand once this run finishes. The run
    | is totalled from this rather than from a re-read, so the total covers
    | the employees who were already generated as well as the ones just
    | written, without paying for another read of the whole month.
    */
    const nextRecords = { ...records };

    /*
    | Sequential on purpose. A payroll run writes one node per employee and
    | firing them all at once buys nothing but a burst of concurrent writes,
    | while a failure part way through is easier to report as "these were
    | generated, these were not".
    */

    for (const employeeId of targets) {

        if (records?.[employeeId] && !regenerate) {
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

            const payroll = buildPayrollSnapshot({
                employeeId,
                employee: employees[employeeId],
                salary,
                summary: summaries[employeeId],
                payrollMonth,
                generatedBy,
            });

            await set(
                ref(db, recordPath(companyCode, payrollMonth, employeeId)),
                payroll
            );

            nextRecords[employeeId] = payroll;

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

    /*
    | The run is only written when something actually landed in it. A pass
    | that generated nothing - every employee already done, or every one of
    | them skipped - leaves the month exactly as it was rather than restamping
    | a run with the same totals.
    */

    const nextRun = generated.length
        ? await writeRun(companyCode, payrollMonth, {
            run,
            records: nextRecords,
            generatedBy,
        })
        : run;

    return {
        success: generated.length > 0,
        generated,
        skipped,
        run: nextRun,
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
| Approve And Lock
|--------------------------------------------------------------------------
| The two steps that close a month.
|
| Both are the same shape: read the run, ask it whether the step is allowed,
| stamp it. The check is repeated here rather than trusted from the caller
| because the dashboard's run is as old as its last load, and two people can
| have the same month open.
|
| Neither recalculates anything. Approving a month does not re-price it - the
| figures being approved are the ones that were generated, and re-running
| them at the moment of sign off would mean approving numbers nobody had
| seen. The totals are carried through from the run exactly as stored.
*/

const advanceRun = async (
    companyCode,
    payrollMonth,
    actor,
    { guard, status, atField, byField, message }
) => {

    if (!companyCode || !isPayrollMonth(payrollMonth)) {
        return { success: false, message: "Select a valid payroll month." };
    }

    const { run, records, legacy } =
        await readRunState(companyCode, payrollMonth);

    const allowed = guard(run);

    if (!allowed.allowed) {
        return { success: false, message: allowed.reason };
    }

    const stamp = {
        status,
        [atField]: Date.now(),
        [byField]: actor || null,
    };

    /*
    | A month generated before runs existed has no node to update, so the run
    | folded out of its records is written in full first. `update` on a path
    | that does not exist would create a run carrying nothing but the stamp.
    |
    | Its records are moved across at the same time. This is the last chance
    | to do it: approving closes the month to generating and locking closes
    | it to everything, so no later write will come along to migrate it.
    */

    let next = { ...run, ...stamp };

    if (!run.generatedAt) {

        if (legacy) {
            await migrateLegacyRecords(companyCode, payrollMonth, records);
        }

        next = {
            ...(await writeRun(companyCode, payrollMonth, { run, records })),
            ...stamp,
        };

    }

    await update(ref(db, runPath(companyCode, payrollMonth)), stamp);

    return { success: true, run: next, message };

};

export const approvePayroll = (companyCode, payrollMonth, approvedBy) =>
    advanceRun(companyCode, payrollMonth, approvedBy, {
        guard: canApproveRun,
        status: PAYROLL_RUN_STATUS.APPROVED,
        atField: "approvedAt",
        byField: "approvedBy",
        message: "Payroll approved. It is now closed to changes.",
    });

export const lockPayroll = (companyCode, payrollMonth, lockedBy) =>
    advanceRun(companyCode, payrollMonth, lockedBy, {
        guard: canLockRun,
        status: PAYROLL_RUN_STATUS.LOCKED,
        atField: "lockedAt",
        byField: "lockedBy",
        message: "Payroll locked. This month is now final.",
    });

/*
|--------------------------------------------------------------------------
| Writes
|--------------------------------------------------------------------------
| Everything that changes a month after it has been generated. Each one asks
| the run first, so a locked month has no way through this file.
*/

export const markPayrollPaid = async (
    companyCode,
    payrollMonth,
    employeeId
) => {

    const { run, records, legacy } =
        await readRunState(companyCode, payrollMonth);

    const allowed = canEditRun(run);

    if (!allowed.allowed) {
        return { success: false, message: allowed.reason };
    }

    if (!records?.[employeeId]) {
        return {
            success: false,
            message: "There is no payroll for this employee in this month.",
        };
    }

    /*
    | Without this the update would land on an empty node under the new
    | shape, and the month would then read as one record holding nothing but
    | a paid stamp while the real payslips sat unreachable under the old one.
    */

    if (legacy) {
        await migrateLegacyRecords(companyCode, payrollMonth, records);
    }

    await update(
        ref(db, recordPath(companyCode, payrollMonth, employeeId)),
        {
            status: PAYROLL_STATUS.PAID,
            paidAt: Date.now(),
        }
    );

    return { success: true, message: "Marked as paid." };

};

/*
| Removing one employee's snapshot re-totals the month, so the run keeps
| describing the records that are actually in it.
*/

export const deletePayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {

    const { run, records, legacy } =
        await readRunState(companyCode, payrollMonth);

    const allowed = canEditRun(run);

    if (!allowed.allowed) {
        return { success: false, message: allowed.reason };
    }

    if (legacy) {
        await migrateLegacyRecords(companyCode, payrollMonth, records);
    }

    await remove(
        ref(db, recordPath(companyCode, payrollMonth, employeeId))
    );

    const nextRecords = { ...records };

    delete nextRecords[employeeId];

    /*
    | The last record out takes the run with it: a month with no payslips in
    | it has not been generated, and leaving an empty run behind would show it
    | as one that had.
    */

    if (Object.keys(nextRecords).length === 0) {
        await remove(ref(db, runPath(companyCode, payrollMonth)));
    } else {
        await writeRun(companyCode, payrollMonth, {
            run,
            records: nextRecords,
        });
    }

    return { success: true, message: "Payroll deleted." };

};

/*
| Whether a month may still be written to at all, for a caller that holds a
| month rather than a run.
*/

export const isPayrollMonthLocked = async (companyCode, payrollMonth) =>
    isRunLocked(await getPayrollRun(companyCode, payrollMonth));
