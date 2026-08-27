import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    FiAlertCircle,
    FiCheckCircle,
    FiInfo,
    FiLock,
} from "react-icons/fi";
import PayrollConfirmModal from "../../components/payroll/PayrollConfirmModal";
import PayrollGeneratingOverlay from "../../components/payroll/PayrollGeneratingOverlay";
import PayrollHeader from "../../components/payroll/PayrollHeader";
import PayrollRunCard from "../../components/payroll/PayrollRunCard";
import PayrollStatsCards from "../../components/payroll/PayrollStatsCards";
import PayrollTable from "../../components/payroll/PayrollTable";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import {
    approvePayroll,
    generateEmployeePayroll,
    generatePayroll,
    getEmployeesWithPayrollStatus,
    lockPayroll,
} from "../../services/payroll/PayRollServices";
import { PAYROLL_PERMISSION } from "../../utils/Payroll/payrollConstants";
import {
    canApproveRun,
    canGenerateRun,
    canLockRun,
    gatePayrollAction,
    toPayrollActor,
} from "../../utils/Payroll/payrollRun";
import {
    formatPayrollMonth,
    getPayrollMonth,
    isFuturePayrollMonth,
} from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Dashboard
|--------------------------------------------------------------------------
| The payroll month: the run it belongs to, the counts, the payout so far and
| every employee on the register with the state their month is in.
|
| The month picker drives every panel, because payroll is calculated and
| stored per month. A month can be run in one go or one employee at a time,
| and both land in the same place, so the whole page reloads after either.
|
| Three actions move a month along - generate, approve, lock - and each is
| gated twice. The state of the run says whether the step is possible at all,
| and the signed in user's permissions say whether they are the one who may
| take it. Both answers are folded into a single gate per action here, and
| the same gate drives the button, its tooltip and the confirmation, so there
| is one place that decides and everything below it only renders.
|
| The service checks the same rules again before it writes. That is not
| belt and braces for its own sake: the run on this page is as old as its
| last load, and a month can be approved by somebody else while it is open.
|--------------------------------------------------------------------------
*/

function PayrollDashboard() {

    const { company, currentUser } = useAuth();

    const companyCode = company?.companyCode;

    const navigate = useNavigate();

    const { canAccessSection } = useRoleAccess();

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const [employees, setEmployees] = useState([]);
    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");

    /*
    | A failed read and a failed run are told apart: the read leaves nothing
    | to show, so the table takes its place with a retry, while a run that
    | fails still has a table under it and only needs the banner.
    */
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [payrollMonth, setPayrollMonth] = useState(getPayrollMonth);

    // Bumped by the refresh button to re-run the load of the current month.
    const [reloadToken, setReloadToken] = useState(0);

    // The employee id a single row is generating for, or "all" for the run.
    const [generating, setGenerating] = useState("");

    // "approve" or "lock" while that step is in flight, and which is confirming.
    const [closing, setClosing] = useState("");
    const [confirming, setConfirming] = useState("");

    useEffect(() => {

        setSearchPlaceholder("Search employees...");

        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };

    }, [setSearch, setSearchPlaceholder]);

    /*
    | Who did it, stamped onto every snapshot and onto each step of the run.
    */
    const actor = useMemo(
        () => toPayrollActor(currentUser),
        [currentUser]
    );

    const loadPayroll = useCallback(async () => {

        if (!companyCode || !payrollMonth) {
            setEmployees([]);
            setRun(null);
            setLoading(false);
            return;
        }

        const data = await getEmployeesWithPayrollStatus(
            companyCode,
            payrollMonth
        );

        setEmployees(data.employees);
        setRun(data.run);

    }, [companyCode, payrollMonth]);

    /*
    | The month can be changed while a load is still in flight, so a stale
    | response is dropped instead of overwriting the newer one.
    */
    useEffect(() => {

        let cancelled = false;

        const load = async () => {

            setLoading(true);
            setLoadError("");
            setError("");
            setNotice("");

            try {

                const data =
                    companyCode && payrollMonth
                        ? await getEmployeesWithPayrollStatus(
                            companyCode,
                            payrollMonth
                        )
                        : { employees: [], run: null };

                if (!cancelled) {
                    setEmployees(data.employees);
                    setRun(data.run);
                }

            }

            catch (err) {

                console.error(err);

                if (!cancelled) {
                    setEmployees([]);
                    setRun(null);
                    setLoadError("Failed to load payroll data.");
                }

            }

            finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        };

        load();

        return () => {
            cancelled = true;
        };

    }, [companyCode, payrollMonth, reloadToken]);

    const totalEmployees = employees.length;

    const generatedCount = employees.filter(
        emp => emp.payrollGenerated
    ).length;

    const pendingCount = totalEmployees - generatedCount;

    const isFutureMonth = isFuturePayrollMonth(payrollMonth);

    /*
    |----------------------------------------------------------------------
    | Gates
    |----------------------------------------------------------------------
    | What may be done to this month, by this user, right now. Each is the
    | state rule and the permission answered together, so a caller gets one
    | boolean and one sentence rather than having to combine them again.
    */

    const generateGate = useMemo(
        () => gatePayrollAction(
            canAccessSection(PAYROLL_PERMISSION.GENERATE),
            canGenerateRun(run),
            "generate"
        ),
        [canAccessSection, run]
    );

    const approveGate = useMemo(
        () => gatePayrollAction(
            canAccessSection(PAYROLL_PERMISSION.APPROVE),
            canApproveRun(run),
            "approve"
        ),
        [canAccessSection, run]
    );

    const lockGate = useMemo(
        () => gatePayrollAction(
            canAccessSection(PAYROLL_PERMISSION.LOCK),
            canLockRun(run),
            "lock"
        ),
        [canAccessSection, run]
    );

    /*
    | What the month costs so far. Only a generated payroll has a figure to
    | add, so this is the payout of the snapshots that exist rather than of
    | the whole register.
    */
    const totalPayout = useMemo(
        () =>
            employees.reduce(
                (sum, employee) => sum + (Number(employee.netPayable) || 0),
                0
            ),
        [employees]
    );

    const busy = Boolean(generating || closing);

    const handleRefresh = () => {

        if (busy) return;

        setReloadToken((token) => token + 1);

    };

    /*
    | Runs the whole month. Employees already generated are left alone by the
    | service, so this is safe to press twice: it only fills in the gaps.
    */
    const handleGenerateAll = async () => {

        if (!companyCode || busy || !generateGate.allowed) return;

        setGenerating("all");
        setError("");
        setNotice("");

        try {

            const result = await generatePayroll(
                companyCode,
                payrollMonth,
                actor
            );

            await loadPayroll();

            if (result.success) {
                setNotice(result.message);
            } else {
                setError(result.message);
            }

        }

        catch (err) {

            console.error(err);

            setError("Failed to generate payroll.");

        }

        finally {

            setGenerating("");

        }

    };

    const handleGenerateOne = async (employeeId) => {

        if (!companyCode || busy || !generateGate.allowed) return;

        setGenerating(employeeId);
        setError("");
        setNotice("");

        try {

            const result = await generateEmployeePayroll(
                companyCode,
                payrollMonth,
                employeeId,
                actor
            );

            await loadPayroll();

            if (result.success) {
                setNotice(`${employeeId}: ${result.message}`);
            } else {
                setError(`${employeeId}: ${result.message}`);
            }

        }

        catch (err) {

            console.error(err);

            setError(`Failed to generate payroll for ${employeeId}.`);

        }

        finally {

            setGenerating("");

        }

    };

    /*
    | Approve and lock are the same shape, so they share one runner. The
    | month is reloaded after either: the run's own state changed, and a
    | closed month changes what every button under it may do.
    */
    const closeMonth = async (step, gate, action) => {

        if (!companyCode || busy || !gate.allowed) return;

        setClosing(step);
        setConfirming("");
        setError("");
        setNotice("");

        try {

            const result = await action(companyCode, payrollMonth, actor);

            await loadPayroll();

            if (result.success) {
                setNotice(result.message);
            } else {
                setError(result.message);
            }

        }

        catch (err) {

            console.error(err);

            setError(`Failed to ${step} payroll.`);

        }

        finally {

            setClosing("");

        }

    };

    /*
    | The payslip page opens on the month that was clicked and offers the two
    | before it, so the month has to travel with the employee.
    */
    const openPayslip = (employeeId) => {
        navigate(
            `/payrolldashboard/payslip/${employeeId}?month=${payrollMonth}`
        );
    };

    const monthLabel = formatPayrollMonth(payrollMonth);

    return (

        <div className="mx-auto max-w-[1600px] p-0 sm:p-2">

            {/*
            | Held open for the whole run, the reload of the month included,
            | so it only lifts once the table underneath has the new figures.
            */}
            <PayrollGeneratingOverlay
                open={Boolean(generating)}
                payrollMonth={payrollMonth}
                employeeId={generating}
            />

            <PayrollConfirmModal
                open={confirming === "approve"}
                title="Approve Payroll"
                message={`Approve the payroll for ${monthLabel}? The figures will be signed off as they stand.`}
                note="Once approved, the month can no longer be generated or re-run."
                confirmText="Approve"
                confirmingText="Approving..."
                confirming={closing === "approve"}
                icon={<FiCheckCircle />}
                tone="ui-btn-primary"
                onConfirm={() =>
                    closeMonth("approve", approveGate, approvePayroll)
                }
                onClose={() => setConfirming("")}
            />

            <PayrollConfirmModal
                open={confirming === "lock"}
                title="Lock Payroll"
                message={`Lock the payroll for ${monthLabel}? This marks the month as final.`}
                note="Locking cannot be undone. Nothing in this month can be changed afterwards."
                confirmText="Lock"
                confirmingText="Locking..."
                confirming={closing === "lock"}
                icon={<FiLock />}
                tone="bg-slate-800 text-white shadow-sm hover:bg-slate-900"
                onConfirm={() => closeMonth("lock", lockGate, lockPayroll)}
                onClose={() => setConfirming("")}
            />

            <PayrollHeader
                payrollMonth={payrollMonth}
                setPayrollMonth={setPayrollMonth}
                onGenerateAll={handleGenerateAll}
                onRefresh={handleRefresh}
                loading={loading}
                generatingAll={generating === "all"}
                isFutureMonth={isFutureMonth}
                pendingCount={pendingCount}
                totalEmployees={totalEmployees}
                generateGate={generateGate}
            />

            {/*
            | The header sits directly on the canvas, so the panels below it
            | open with the same gap the Dashboard leaves under its greeting
            | rather than being pulled up against the heading.
            */}
            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

                <PayrollRunCard
                    run={run}
                    payrollMonth={payrollMonth}
                    loading={loading}
                    busy={closing}
                    approveGate={approveGate}
                    lockGate={lockGate}
                    onApprove={() => setConfirming("approve")}
                    onLock={() => setConfirming("lock")}
                />

                <PayrollStatsCards
                    totalEmployees={totalEmployees}
                    generatedCount={generatedCount}
                    pendingCount={pendingCount}
                    totalPayout={totalPayout}
                    loading={loading}
                />

                {/*
                | A month that has not started cannot be run, and the disabled
                | button alone does not say why, so the reason is spelled out.
                */}
                {isFutureMonth && (

                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 sm:p-4 sm:text-sm">

                        <FiInfo className="mt-0.5 shrink-0" size={16} />

                        <span>
                            {monthLabel} has not started yet, so payroll cannot
                            be generated for it.
                        </span>

                    </div>

                )}

                {notice && (

                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 sm:p-4 sm:text-sm">

                        <FiCheckCircle className="mt-0.5 shrink-0" size={16} />

                        <span>{notice}</span>

                    </div>

                )}

                {error && (

                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 sm:p-4 sm:text-sm">

                        <FiAlertCircle className="mt-0.5 shrink-0" size={16} />

                        <span>{error}</span>

                    </div>

                )}

                <PayrollTable
                    employees={employees}
                    loading={loading}
                    error={loadError}
                    onRetry={handleRefresh}
                    payrollMonth={payrollMonth}
                    headerSearch={search}
                    generating={generating}
                    isFutureMonth={isFutureMonth}
                    generateGate={generateGate}
                    onGenerate={handleGenerateOne}
                    onViewPayslip={openPayslip}
                />

            </div>

        </div>

    );

}

export default PayrollDashboard;
