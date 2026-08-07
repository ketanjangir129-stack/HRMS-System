import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";
import PayrollHeader from "../../components/payroll/PayrollHeader";
import PayrollStatsCards from "../../components/payroll/PayrollStatsCards";
import PayrollTable from "../../components/payroll/PayrollTable";
import useAuth from "../../hooks/useAuth";
import {
    generateEmployeePayroll,
    generatePayroll,
    getEmployeesWithPayrollStatus,
} from "../../services/payroll/PayRollServices";
import {
    formatPayrollMonth,
    getPayrollMonth,
    isFuturePayrollMonth,
} from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Dashboard
|--------------------------------------------------------------------------
| The payroll month: the counts, the payout so far and every employee on the
| register with the state their month is in.
|
| The month picker drives every panel, because payroll is calculated and
| stored per month. A month can be run in one go or one employee at a time,
| and both land in the same place, so the whole page reloads after either.
|--------------------------------------------------------------------------
*/

function PayrollDashboard() {

    const { company, currentUser } = useAuth();

    const companyCode = company?.companyCode;

    const navigate = useNavigate();

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const [employees, setEmployees] = useState([]);
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

    useEffect(() => {

        setSearchPlaceholder("Search employees...");

        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };

    }, [setSearch, setSearchPlaceholder]);

    /*
    | Who ran the payroll, stamped onto every snapshot. `currentUser` is the
    | whole employee record for HR and employees, and a small object for the
    | owner, so both shapes are read.
    */
    const generatedBy = useMemo(() => ({
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
            "unknown",
    }), [currentUser]);

    const loadEmployees = useCallback(async () => {

        if (!companyCode || !payrollMonth) {
            setEmployees([]);
            setLoading(false);
            return;
        }

        const data = await getEmployeesWithPayrollStatus(
            companyCode,
            payrollMonth
        );

        setEmployees(data);

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
                        : [];

                if (!cancelled) {
                    setEmployees(data);
                }

            }

            catch (err) {

                console.error(err);

                if (!cancelled) {
                    setEmployees([]);
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

    const handleRefresh = () => {

        if (generating) return;

        setReloadToken((token) => token + 1);

    };

    /*
    | Runs the whole month. Employees already generated are left alone by the
    | service, so this is safe to press twice: it only fills in the gaps.
    */
    const handleGenerateAll = async () => {

        if (!companyCode || generating) return;

        setGenerating("all");
        setError("");
        setNotice("");

        try {

            const result = await generatePayroll(
                companyCode,
                payrollMonth,
                generatedBy
            );

            await loadEmployees();

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

        if (!companyCode || generating) return;

        setGenerating(employeeId);
        setError("");
        setNotice("");

        try {

            const result = await generateEmployeePayroll(
                companyCode,
                payrollMonth,
                employeeId,
                generatedBy
            );

            await loadEmployees();

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
    | The payslip page opens on the month that was clicked and offers the two
    | before it, so the month has to travel with the employee.
    */
    const openPayslip = (employeeId) => {
        navigate(
            `/payrolldashboard/payslip/${employeeId}?month=${payrollMonth}`
        );
    };

    return (

        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

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

                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">

                    <FiInfo className="mt-0.5 shrink-0" size={16} />

                    <span>
                        {formatPayrollMonth(payrollMonth)} has not started yet,
                        so payroll cannot be generated for it.
                    </span>

                </div>

            )}

            {notice && (

                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">

                    <FiCheckCircle className="mt-0.5 shrink-0" size={16} />

                    <span>{notice}</span>

                </div>

            )}

            {error && (

                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">

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
                onGenerate={handleGenerateOne}
                onViewPayslip={openPayslip}
            />

        </div>

    );

}

export default PayrollDashboard;
