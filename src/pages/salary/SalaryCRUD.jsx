import { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { BsClockHistory } from "react-icons/bs";
import { TbMoneybagEdit } from "react-icons/tb";
import { FiPlus, FiUsers, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { getEmployeeWithSalaryStatus, getAllSalary } from "../../services/SalaryService";
import { filterData } from "../../utils/search/filterData";
import { exportSalariesToExcel } from "../../utils/salary/exportSalaries";
import {
    AttendancePanel,
    ExportButton,
    FilterSelect,
} from "../../components/attendance/common/AttendancePanel";
import DataTable from "../../components/attendance/common/DataTable";
import EmployeeCell from "../../components/attendance/common/EmployeeCell";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import useRoleAccess from "../../hooks/useRoleAccess";

/*
|--------------------------------------------------------------------------
| Create & Update Salaries
|--------------------------------------------------------------------------
| Every employee on the register with the state of their salary structure,
| and the action that either assigns one or opens it for a revision.
|
| The panel, the table and the toolbar controls are the shared ones used by
| the attendance and payroll modules, so filtering stays here while sorting,
| pagination and the loading / empty states live in `DataTable`.
|
| Columns are prioritised rather than all forced onto a phone: the employee,
| the status and the action stay on every screen, and the department and the
| designation drop out as the viewport narrows. Both are repeated inside the
| employee cell, so nothing is lost on a small screen.
|--------------------------------------------------------------------------
*/

const HIDDEN_UNTIL = {
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
};

const STATUS_FILTERS = [
    { value: "assigned", label: "Assigned" },
    { value: "pending", label: "Not Assigned" },
];

function SalaryCRUD() {
    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    const { canAccessSection } = useRoleAccess();

    /*
    | Each action opens a guarded route, so none of them is offered without the
    | permission that lets it open.
    */
    const canCreate = canAccessSection("salary.create");
    const canUpdate = canAccessSection("salary.update");
    const canViewHistory = canAccessSection("salary.history");

    /*
    | The export carries the amounts themselves, so it is offered only to
    | someone who is already allowed to read an assigned structure.
    */
    const canExport = canUpdate || canViewHistory;

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const data =
                await getEmployeeWithSalaryStatus(companyCode);
            setEmployees(data);
        }
        catch (error) {
            console.error(error);
        }

        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadEmployees();
    }, []);

    const departments = useMemo(
        () => [
            ...new Set(
                employees
                    .map((employee) => employee.department)
                    .filter(Boolean)
            ),
        ],
        [employees]
    );

    /*
    | What the table shows is also what the export carries, so the filtered
    | list is derived from the register rather than kept in its own state -
    | the two cannot fall out of step that way.
    */
    const filteredEmployees = useMemo(() => {

        const searched = filterData(
            employees,
            search,
            [
                "employeeId",
                "name",
                "department",
                "designation",
            ]
        );

        return searched.filter((employee) => {

            const matchesDepartment =
                !departmentFilter ||
                employee.department === departmentFilter;

            const matchesStatus =
                !statusFilter ||
                (statusFilter === "assigned"
                    ? employee.salaryAssigned
                    : !employee.salaryAssigned);

            return matchesDepartment && matchesStatus;

        });

    }, [
        employees,
        search,
        departmentFilter,
        statusFilter,
    ]);

    /*
    | The table only holds who an employee is, so the structures behind the
    | rows are fetched at export time and matched to whatever the filters
    | have left on screen.
    */
    const handleExport = async () => {

        if (!canExport) {
            toast.error("You are not allowed to export salaries.");
            return;
        }

        if (!filteredEmployees.length) {
            toast.info("There is nothing to export.");
            return;
        }

        setExporting(true);

        try {

            const salaries = await getAllSalary(companyCode);

            exportSalariesToExcel(
                filteredEmployees,
                salaries
            );

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

    useEffect(() => {
        return () => {
            setSearch("");
        };
    }, []);

    useEffect(() => {
        setSearchPlaceholder("Search employee...");
        return () => {
            setSearchPlaceholder("Search...");
        };

    }, []);

    const assignedCount = employees.filter(
        (employee) => employee.salaryAssigned
    ).length;

    /*
    | Counts are read from the whole register rather than the filtered list, so
    | they stay a summary of the company instead of restating the table.
    |
    | The number itself is set in ink and the hue is carried by the tile and the
    | bar above it, which is how the dashboard's stat cards read: three coloured
    | figures side by side compete, one ink figure with a coloured marker does
    | not.
    */
    const stats = [
        {
            title: "Total Employees",
            value: employees.length,
            subtitle: "On the register",
            icon: <FiUsers />,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            bar: "bg-blue-500",
        },
        {
            title: "Salary Assigned",
            value: assignedCount,
            subtitle: "Structure in place",
            icon: <FiCheckCircle />,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            bar: "bg-emerald-500",
        },
        {
            title: "Not Assigned",
            value: employees.length - assignedCount,
            subtitle: "Awaiting a structure",
            icon: <FiAlertCircle />,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            bar: "bg-amber-500",
        },
    ];

    /*
    | Written out in full rather than built from a breakpoint variable:
    | Tailwind generates its CSS by scanning the source for literal class
    | names, so an interpolated `${bp}:table-cell` would never be emitted.
    */
    const hideBelow = (breakpoint) => ({
        headerClassName: HIDDEN_UNTIL[breakpoint],
        className: HIDDEN_UNTIL[breakpoint],
    });

    const columns = [

        {
            key: "name",
            label: "Employee",
            sortable: true,
            render: (row) => (

                <div className="min-w-0">

                    <EmployeeCell
                        name={row.name}
                        employeeId={row.employeeId}
                    />

                    {/*
                    | The columns hidden at this width, folded in here. Each span
                    | is hidden at exactly the breakpoint where its own column
                    | appears, so a value is never shown twice and never missing
                    | in between.
                    */}
                    <p className="mt-1 truncate pl-14 text-xs text-ink-subtle lg:hidden">

                        <span className="md:hidden">
                            {row.department || "--"}
                            {row.designation ? " · " : ""}
                        </span>

                        {row.designation || ""}

                    </p>

                </div>

            ),
        },

        {
            key: "department",
            label: "Department",
            sortable: true,
            ...hideBelow("md"),
            render: (row) => (
                <span className="text-sm text-ink-muted">
                    {row.department || "--"}
                </span>
            ),
        },

        {
            key: "designation",
            label: "Designation",
            ...hideBelow("lg"),
            render: (row) => (
                <span className="text-sm text-ink-muted">
                    {row.designation || "--"}
                </span>
            ),
        },

        {
            key: "salaryAssigned",
            label: "Status",
            sortable: true,
            align: "center",
            render: (row) => (

                <span
                    className={`ui-badge ${row.salaryAssigned
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                        }`}
                >

                    <span
                        className={`h-1.5 w-1.5 rounded-full ${row.salaryAssigned ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                    />

                    {row.salaryAssigned ? "Assigned" : "Not Assigned"}

                </span>

            ),
        },

        {
            key: "actions",
            label: "Action",
            align: "right",
            className: "whitespace-nowrap",
            render: (row) => {

                if (!row.salaryAssigned) {

                    if (!canCreate) {
                        return <span className="text-sm text-ink-faint">--</span>;
                    }

                    return (

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/salarydashboard/salary/create/${row.employeeId}`
                                )
                            }
                            title="Assign salary to this employee"
                            className="ui-btn ui-btn-primary px-4 py-2 font-semibold"
                        >

                            <FiPlus size={14} />

                            Assign Salary

                        </button>

                    );

                }

                /*
                | A row whose both actions were withheld would otherwise render
                | an empty cell with no explanation.
                */
                if (!canUpdate && !canViewHistory) {
                    return <span className="text-sm text-ink-faint">--</span>;
                }

                return (

                    <div className="flex items-center justify-end gap-2">

                        {canUpdate && (

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/salarydashboard/salary/edit/${row.employeeId}`
                                    )
                                }
                                title="Edit employee salary"
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-line text-ink-subtle transition-all hover:border-brand hover:bg-blue-50 hover:text-brand"
                            >
                                <TbMoneybagEdit size={18} />
                            </button>

                        )}

                        {canViewHistory && (

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/salarydashboard/salary/history/${row.employeeId}`
                                    )
                                }
                                title="Check salary history"
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-line text-ink-subtle transition-all hover:border-brand hover:bg-blue-50 hover:text-brand"
                            >
                                <BsClockHistory size={16} />
                            </button>

                        )}

                    </div>

                );

            },
        },

    ];

    return (

        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            <SalaryPageHeader
                title="Create & Update Salaries"
                subtitle="Assign a new salary structure or revise an existing one."
                icon={<TbMoneybagEdit />}
                backTo="/salarydashboard"
                action={
                    !loading && (
                        <span className="ui-badge bg-blue-50 text-blue-700">
                            {assignedCount} of {employees.length} assigned
                        </span>
                    )
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">

                {stats.map((stat) => (

                    <div
                        key={stat.title}
                        className="ui-card ui-card-interactive group relative overflow-hidden p-4 sm:p-6"
                    >

                        <span
                            className={`absolute left-0 top-0 h-1 w-full ${stat.bar}`}
                        />

                        <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                                <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                                    {stat.title}
                                </p>

                                <h3 className="mt-1 text-3xl font-bold text-ink sm:mt-2 sm:text-4xl">
                                    {loading ? "--" : stat.value}
                                </h3>

                                <p className="mt-2 text-[11px] font-medium text-ink-subtle sm:text-xs">
                                    {stat.subtitle}
                                </p>

                            </div>

                            <div
                                className={`ui-tile h-10 w-10 text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${stat.iconBg} ${stat.iconColor}`}
                            >
                                {stat.icon}
                            </div>

                        </div>

                    </div>

                ))}

            </div>

            {/* Employees */}
            <AttendancePanel
                title="Employee Salaries"
                subtitle="Create new entries or update existing ones here."
                toolbar={
                    <>

                        <div className="w-full sm:w-52 lg:w-auto">

                            <FilterSelect
                                value={departmentFilter}
                                onChange={setDepartmentFilter}
                                options={departments}
                                placeholder="All Departments"
                                ariaLabel="Filter by department"
                            />

                        </div>

                        <div className="w-full sm:w-52 lg:w-auto">

                            <FilterSelect
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={STATUS_FILTERS}
                                placeholder="All Status"
                                ariaLabel="Filter by salary status"
                            />

                        </div>

                        {canExport && (
                            <ExportButton
                                onClick={handleExport}
                                disabled={exporting}
                                label={exporting ? "Exporting..." : "Export Salary"}
                            />
                        )}

                    </>
                }
            >

                <DataTable
                    columns={columns}
                    rows={filteredEmployees}
                    rowKey={(row) => row.employeeId}
                    loading={loading}
                    skeleton
                    defaultSortBy="name"
                    defaultSortOrder="asc"
                    resetKey={`${search}|${departmentFilter}|${statusFilter}`}
                    paginationLabel="employees"
                    /*
                    | Grows with the columns that appear at each breakpoint, so a
                    | phone scrolls a compact three column table instead of a
                    | 900px one.
                    */
                    minWidthClass="min-w-[520px] md:min-w-[680px] lg:min-w-[880px]"
                    loadingMessage="Loading employees..."
                    empty={{
                        icon: <TbMoneybagEdit size={28} />,
                        title:
                            employees.length === 0
                                ? "No Employees Found"
                                : "No Matching Employees",
                        message:
                            employees.length === 0
                                ? "Employees added to the company will appear here."
                                : "No one on the register matches this search or filter.",
                    }}
                />

            </AttendancePanel>

        </div>
    );
}

export default SalaryCRUD;
