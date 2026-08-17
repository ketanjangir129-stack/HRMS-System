import { useState, useEffect, useMemo } from "react";
import {
    useNavigate,
    useOutletContext,
    useSearchParams,
} from "react-router-dom";
import { BsClockHistory } from "react-icons/bs";
import { TbMoneybagEdit, TbReportMoney } from "react-icons/tb";
import { FiLock } from "react-icons/fi";
import { toast } from "react-toastify";
import * as salaryService from "../../services/SalaryService";
import { exportSalariesToExcel } from "../../utils/salary/exportSalaries";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import SalaryRegisterTable from "../../components/salary/SalaryRegisterTable";
import SalaryRevisionsPanel from "../../components/salary/SalaryRevisionsPanel";
import SalaryStatsCards from "../../components/salary/SalaryStatsCards";
import SalaryTabs from "../../components/salary/SalaryTabs";
import useRoleAccess from "../../hooks/useRoleAccess";

/*
|--------------------------------------------------------------------------
| Salary
|--------------------------------------------------------------------------
| The whole salary module on one screen, reached from the sidebar and the
| dashboard's quick links.
|
| It used to be a landing page of two cards that led to two more pages. The
| cards said nothing the pages did not say better, so the landing page is
| gone and its two destinations are tabs here instead: the register that
| structures are created and revised on, and the history of every revision
| that has been made.
|
| That pairing is the point of the merge — a revision is read and then made
| from the same screen, rather than through a menu and back.
|
| This file is the container only. It owns which tab is showing, the register
| itself and the permissions that decide what may be offered; the summary,
| the tab bar, the table and the revision history are components under
| `components/salary`.
|
| The two sections keep the permissions they were mounted behind as routes:
| `salary.manage` and `salary.revisions` now gate a tab rather than an
| address, so a role that was only ever given one of them still sees only
| that one.
|--------------------------------------------------------------------------
*/

const TAB = {
    REGISTER: "register",
    REVISIONS: "revisions",
};

function SalaryCRUD() {

    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    const { canAccessSection } = useRoleAccess();

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    /*
    | Each action opens a guarded route, so none of them is offered without
    | the permission that lets it open.
    */
    const canManage = canAccessSection("salary.manage");
    const canViewRevisions = canAccessSection("salary.revisions");
    const canCreate = canAccessSection("salary.create");
    const canUpdate = canAccessSection("salary.update");
    const canViewHistory = canAccessSection("salary.history");

    /*
    | The export carries the amounts themselves, so it is offered only to
    | someone who is already allowed to read an assigned structure.
    */
    const canExport = canUpdate || canViewHistory;

    const tabs = useMemo(
        () =>
            [
                {
                    key: TAB.REGISTER,
                    label: "Create & Update",
                    description:
                        "Assign a new salary structure or revise an existing one",
                    icon: <TbMoneybagEdit />,
                    allowed: canManage,
                },
                {
                    key: TAB.REVISIONS,
                    label: "Revision History",
                    description: "Every revision made to a salary structure",
                    icon: <BsClockHistory />,
                    allowed: canViewRevisions,
                },
            ].filter((tab) => tab.allowed),
        [canManage, canViewRevisions]
    );

    /*
    | The tab lives in the address so a revision can be linked to and the back
    | button steps between the two rather than off the screen. A tab this role
    | cannot open — or a value nobody recognises — falls back to the first one
    | it can.
    */
    const [searchParams, setSearchParams] = useSearchParams();

    const requestedTab = searchParams.get("tab");

    const activeTab = tabs.some((tab) => tab.key === requestedTab)
        ? requestedTab
        : tabs[0]?.key || "";

    const openTab = (key) => {
        setSearchParams(key === tabs[0]?.key ? {} : { tab: key }, {
            replace: true,
        });
    };

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(canManage);
    const [exporting, setExporting] = useState(false);

    /*
    | The register belongs to the first tab, so it is only read for a role
    | that has it. A revisions-only role loads the revisions and nothing else.
    */
    useEffect(() => {

        let cancelled = false;

        const load = async () => {

            if (!canManage) {
                setEmployees([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {

                const data = await salaryService.getEmployeeWithSalaryStatus(companyCode);

                if (!cancelled) {
                    setEmployees(data);
                }

            }

            catch (error) {

                console.error(error);

                if (!cancelled) {
                    setEmployees([]);
                    toast.error("Could not load the salary register.");
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

    }, [companyCode, canManage]);

    // The navbar search is shared, so it says what the tab under it searches.
    useEffect(() => {

        setSearchPlaceholder(
            activeTab === TAB.REVISIONS
                ? "Search revisions..."
                : "Search employee..."
        );

    }, [activeTab, setSearchPlaceholder]);

    /*
    | A term typed for one tab means nothing to the other, and the box itself
    | belongs to the layout, so it is cleared on the way out as well as on the
    | way between the two.
    */
    useEffect(() => {
        setSearch("");
    }, [activeTab, setSearch]);

    useEffect(() => {

        return () => {
            setSearch("");
            setSearchPlaceholder("Search...");
        };

    }, [setSearch, setSearchPlaceholder]);

    const assignedCount = employees.filter(
        (employee) => employee.salaryAssigned
    ).length;

    /*
    | The table only holds who an employee is, so the structures behind the
    | rows are fetched at export time and matched to whatever the filters
    | have left on screen.
    */
    const handleExport = async (rows) => {

        if (!canExport) {
            toast.error("You are not allowed to export salaries.");
            return;
        }

        if (!rows.length) {
            toast.info("There is nothing to export.");
            return;
        }

        setExporting(true);

        try {

            const salaries = await salaryService.getAllSalary(companyCode);

            exportSalariesToExcel(rows, salaries);

            toast.success("Salary details exported.");

        }

        catch (error) {
            console.error(error);
            toast.error("Could not export salary details.");
        }

        finally {
            setExporting(false);
        }

    };

    const openEmployeeHistory = (employeeId) =>
        navigate(`/salarydashboard/salary/history/${employeeId}`);

    return (

        <div className="mx-auto max-w-[1600px] space-y-4 p-0 sm:space-y-6 sm:p-2">

            <SalaryPageHeader
                title="Salary Management"
                subtitle="Assign a salary structure, revise it, and review every change."
                icon={<TbReportMoney />}
                /* Top-level page, so the heading sits in a card like the
                   payroll and task screens rather than bare on the grey. */
                card
                action={
                    activeTab === TAB.REGISTER &&
                    !loading &&
                    employees.length > 0 && (
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                            {assignedCount} of {employees.length} assigned
                        </span>
                    )
                }
            />

            <SalaryTabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={openTab}
            />

            {/*
            | A role with the salary page but neither section on it. The page
            | is still reachable, so it says why it is empty instead of
            | rendering nothing at all.
            */}
            {tabs.length === 0 && (

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FiLock size={24} />
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-slate-900">
                        Nothing to show here yet
                    </h2>

                    <p className="mt-1 max-w-md text-sm text-slate-500">
                        Your role does not include the salary register or the
                        revision history. Contact the account owner if you need
                        either of them enabled.
                    </p>

                </div>

            )}

            {activeTab === TAB.REGISTER && (

                <>

                    <SalaryStatsCards
                        totalEmployees={employees.length}
                        assignedCount={assignedCount}
                        loading={loading}
                    />

                    <SalaryRegisterTable
                        employees={employees}
                        loading={loading}
                        search={search}
                        canCreate={canCreate}
                        canUpdate={canUpdate}
                        canViewHistory={canViewHistory}
                        canExport={canExport}
                        exporting={exporting}
                        onExport={handleExport}
                        onAssign={(employeeId) =>
                            navigate(
                                `/salarydashboard/salary/create/${employeeId}`
                            )
                        }
                        onEdit={(employeeId) =>
                            navigate(
                                `/salarydashboard/salary/edit/${employeeId}`
                            )
                        }
                        onViewHistory={openEmployeeHistory}
                    />

                </>

            )}

            {activeTab === TAB.REVISIONS && (

                <SalaryRevisionsPanel
                    search={search}
                    onViewEmployeeHistory={
                        canViewHistory ? openEmployeeHistory : undefined
                    }
                    onGoToRegister={
                        canManage ? () => openTab(TAB.REGISTER) : undefined
                    }
                />

            )}

        </div>

    );

}

export default SalaryCRUD;
