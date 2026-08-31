import { useMemo, useState } from "react";
import { BsClockHistory } from "react-icons/bs";
import { TbMoneybagEdit } from "react-icons/tb";
import { FiEdit2, FiPlus } from "react-icons/fi";
import {
    AttendancePanel,
    ExportButton,
    FilterSelect,
} from "../attendance/common/AttendancePanel";
import DataTable from "../attendance/common/DataTable";
import EmployeeCell from "../attendance/common/EmployeeCell";
import SalaryEmployeeCard from "./SalaryEmployeeCard";
import SalaryStatusBadge from "./SalaryStatusBadge";
import { filterData } from "../../utils/search/filterData";

/*
|--------------------------------------------------------------------------
| Salary Register Table
|--------------------------------------------------------------------------
| Every employee on the register with the state of their salary structure,
| and the action that either assigns one or opens it for a revision.
|
| The panel, the table and the toolbar controls are the shared ones used by
| the attendance and payroll modules, so filtering stays here while sorting,
| pagination and the loading / empty states live in `DataTable`.
|
| Filtering is owned here rather than by the page, because the export carries
| exactly what the filters have left on screen — the two cannot fall out of
| step if only one list exists. `onExport` is handed that list.
|
| Columns are prioritised rather than all forced onto a narrow tablet: the
| employee, the status and the action stay on every screen, and the
| department and the designation drop out as the viewport narrows. Both are
| repeated inside the employee cell, so nothing is lost.
|
| Below `md` even that is too many columns for the width, so the same rows
| are rendered as cards instead — see `SalaryEmployeeCard`.
|
| Which actions are offered is decided by the page and passed in: each one
| opens a guarded route, so none of them is shown without the permission
| that lets it open.
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

/*
| Written out in full rather than built from a breakpoint variable:
| Tailwind generates its CSS by scanning the source for literal class names,
| so an interpolated `${bp}:table-cell` would never be emitted.
*/
const hideBelow = (breakpoint) => ({
    headerClassName: HIDDEN_UNTIL[breakpoint],
    className: HIDDEN_UNTIL[breakpoint],
});

function SalaryRegisterTable({
    employees = [],
    loading = false,
    search = "",
    canCreate = false,
    canUpdate = false,
    canViewHistory = false,
    canExport = false,
    exporting = false,
    onExport,
    onAssign,
    onEdit,
    onViewHistory,
}) {

    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

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
    | A department that has been filtered to can disappear from the register
    | on the next load, which would leave the select showing a filter that
    | matches nothing and no way back to it. Derived rather than corrected in
    | an effect: the select and the rows both read this, so the two cannot
    | disagree for the render in between.
    */
    const activeDepartment = departments.includes(departmentFilter)
        ? departmentFilter
        : "";

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
                !activeDepartment ||
                employee.department === activeDepartment;

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
        activeDepartment,
        statusFilter,
    ]);

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
                    <p className="mt-1 truncate pl-14 text-xs text-slate-500 lg:hidden">

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
                <span className="text-sm text-slate-600">
                    {row.department || "--"}
                </span>
            ),
        },

        {
            key: "designation",
            label: "Designation",
            ...hideBelow("lg"),
            render: (row) => (
                <span className="text-sm text-slate-600">
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
                <SalaryStatusBadge assigned={row.salaryAssigned} />
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
                        return <span className="text-sm text-slate-300">--</span>;
                    }

                    return (

                        <button
                            type="button"
                            onClick={() => onAssign(row.employeeId)}
                            title="Assign salary to this employee"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
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
                    return <span className="text-sm text-slate-300">--</span>;
                }

                return (

                    <div className="flex items-center justify-end gap-2">

                        {canUpdate && (

                            <button
                                type="button"
                                onClick={() => onEdit(row.employeeId)}
                                title="Edit employee salary"
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                            >
                                <TbMoneybagEdit size={18} />
                            </button>

                        )}

                        {canViewHistory && (

                            <button
                                type="button"
                                onClick={() => onViewHistory(row.employeeId)}
                                title="Check salary history"
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                            >
                                <BsClockHistory size={16} />
                            </button>

                        )}

                    </div>

                );

            },
        },

    ];

    /*
    | The phone card puts these behind its three dot button. Each opens the
    | same guarded route as its desktop counterpart, so each is offered only
    | with the permission that lets it open — a card left with none simply has
    | no button.
    */
    const getActions = (row) => {

        if (!row.salaryAssigned) {

            if (!canCreate) return [];

            return [
                {
                    key: "assign",
                    label: "Assign Salary",
                    title: "Assign salary to this employee",
                    icon: <FiPlus size={15} />,
                    onClick: () => onAssign(row.employeeId),
                },
            ];

        }

        const actions = [];

        if (canUpdate) {
            actions.push({
                key: "edit",
                label: "Edit",
                title: "Edit employee salary",
                icon: <FiEdit2 size={15} />,
                onClick: () => onEdit(row.employeeId),
            });
        }

        if (canViewHistory) {
            actions.push({
                key: "revision",
                label: "Revision",
                title: "Check salary revision history",
                icon: <BsClockHistory size={15} />,
                onClick: () => onViewHistory(row.employeeId),
            });
        }

        return actions;

    };

    return (

        <AttendancePanel
            title="Employee Salaries"
            subtitle="Create new entries or update existing ones here."
            toolbar={
                /*
                | The panel spaces its toolbar children apart, which is what
                | the attendance screens want with a search box on the left.
                | Nothing sits on the left here, so the controls are handed
                | over as one child and pushed to the right edge instead —
                | only from `lg`, where the toolbar becomes a row at all.
                */
                <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-start">

                    <div className="w-full sm:w-52 lg:w-auto">

                        <FilterSelect
                            value={activeDepartment}
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
                            onClick={() => onExport(filteredEmployees)}
                            disabled={exporting}
                            label={exporting ? "Exporting..." : "Export Salary"}
                        />
                    )}

                </div>
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
                resetKey={`${search}|${activeDepartment}|${statusFilter}`}
                paginationLabel="employees"
                mobileCard={(row) => (
                    <SalaryEmployeeCard
                        employee={row}
                        actions={getActions(row)}
                    />
                )}
                /*
                | Grows with the columns that appear at each breakpoint, so a
                | narrow tablet scrolls a compact three column table instead
                | of a 900px one.
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

    );

}

export default SalaryRegisterTable;
