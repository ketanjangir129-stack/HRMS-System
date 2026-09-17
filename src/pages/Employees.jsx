import { useEffect, useMemo, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate, useOutletContext } from "react-router-dom";
import { searchEmployees } from "../utils/search/searchEmployees";
import Loader from "../components/common/Loader";
import {
    FiAlertTriangle,
    FiChevronRight,
    FiUserPlus,
    FiUsers,
} from "react-icons/fi";
import useRoleAccess from "../hooks/useRoleAccess";
import useManagerScope from "../hooks/useManagerScope";
import usePagination from "../hooks/usePagination";
import Pagination from "../components/common/pagination/Pagination";
import DepartmentScopeNotice from "../components/common/DepartmentScopeNotice";
import SearchableSelect from "../components/common/SearchableSelect";
import EmployeeCard, {
    EmployeeStatusBadge,
} from "../components/employees/EmployeeCard";

/*
| The avatar falls back to the employee id when a record has no name, so a
| half filled row still reads as a person instead of an empty circle.
*/
const getInitials = (value = "") =>
    String(value)
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");
    const { canAccessSection } = useRoleAccess();

    // Both open a guarded route, so neither is offered without its permission.
    const canAdd = canAccessSection("employees.add");
    const canOpenDetails = canAccessSection("employees.details");

    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [department, setDepartment] = useState("all");
    const { search, setSearch, setSearchPlaceholder } = useOutletContext();

    /*
    | The directory a manager reads is the people they are responsible for, so
    | it is narrowed to their departments. Everybody else gets the list back
    | unchanged.
    */
    const { filterEmployees, isScoped, loading: scopeLoading } =
        useManagerScope();

    const employees = useMemo(
        () => filterEmployees(allEmployees),
        [filterEmployees, allEmployees]
    );


    const loadEmployees = async () => {
        setError("");

        try {
            const data = await getEmployees(companyCode);


            const employeeArray = Object.keys(data).map((key) => {
                const employee = data[key];

                return {
                    id: key,

                    employeeId:
                        employee.employmentInfo?.employeeId ||
                        "",

                    name:
                        employee.personalInfo?.name ||
                        employee.employmentInfo?.name ||
                        "",

                    email:
                        employee.personalInfo?.email ||
                        employee.employmentInfo?.email ||
                        "",

                    department:
                        employee.employmentInfo?.department ||
                        "",

                    designation:
                        employee.employmentInfo?.designation ||
                        "",

                    // Purane records mein status top level par bhi ho sakta hai
                    status:
                        employee.account?.status ||
                        employee.status ||
                        "Active",
                };
            });
            setAllEmployees(employeeArray);
        } catch (err) {
            console.error("Failed to load employees:", err);
            setAllEmployees([]);
            setError(err.message || "Failed to load employees.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    /*
    | The dropdown is built from the rows actually on screen, so a manager only
    | ever sees the departments inside their own scope and no option can point
    | at an empty list.
    */
    const departmentOptions = useMemo(
        () => [
            { value: "all", label: "All Departments" },
            ...[...new Set(employees.map((emp) => emp.department).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b))
                .map((name) => ({ value: name, label: name })),
        ],
        [employees]
    );

    const scopedEmployees = useMemo(
        () =>
            department === "all"
                ? employees
                : employees.filter((emp) => emp.department === department),
        [employees, department]
    );

    const filteredEmployees = searchEmployees(scopedEmployees, search);
    const {
        paginatedData: paginatedEmployees,
        currentPage,
        totalPages,
        totalItems,
        startItem,
        endItem,
        pageSize,
        goToPage,
        changePageSize,
        resetPagination,
    } = usePagination({
        data: filteredEmployees,
        initialPageSize: 5,
    });

    useEffect(() => {
        return () => {
            setSearch("");
        };
    }, []);
    useEffect(() => {
        setSearchPlaceholder("Search Employees here...");
        return () => {
            setSearchPlaceholder("Search...");
        };

    }, []);
    useEffect(() => {
        resetPagination();
    }, [search, department]);

    const placeholder = <span className="text-ink-faint">—</span>;

    return (
        <div className="flex-1 min-h-full space-y-4 sm:space-y-6">

            {/*
            | Header
            |
            | Same shape the dashboard opens with: a small brand eyebrow for
            | context, the page name at heading size, and one quiet line under
            | it. No card around it — the panel below is the page's first
            | surface, and boxing the title as well made the screen read as two
            | competing headers.
            */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">

                <div className="min-w-0">

                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
                        <FiUsers className="shrink-0" size={14} />
                        <span className="truncate">Directory</span>
                    </div>

                    <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
                        Employees
                    </h1>

                    <p className="mt-1 text-sm text-ink-subtle">
                        {search || department !== "all"
                            ? `${filteredEmployees.length} of ${employees.length} employees`
                            : `${employees.length} total employee${employees.length === 1 ? "" : "s"}`}
                    </p>

                </div>

                {canAdd && (
                    <button
                        type="button"
                        onClick={() => navigate("/employees/add")}
                        title="Add Employee"
                        aria-label="Add Employee"
                        className="ui-btn ui-btn-primary group w-full font-semibold sm:w-auto"
                    >
                        <FiUserPlus
                            size={18}
                            className="transition-transform duration-200 group-hover:scale-110"
                        />
                        
                    </button>
                )}

            </div>

            <DepartmentScopeNotice subject="employees" />

            {/* Directory */}
            <div className="ui-card overflow-hidden">

                <div className="flex flex-col gap-4 border-b border-line-subtle px-5 pb-4 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                        <h2 className="ui-card-title">
                            Employees List
                        </h2>

                        <p className="ui-card-subtitle">
                            {isScoped
                                ? "Everyone in the departments you manage, and their current status."
                                : "Everyone on the company and their current status."}
                        </p>

                    </div>

                    {/*
                    | Department filter. Not `.ui-field` — the kit's field fills
                    | its line, and this control is a panel action that sits at
                    | its own width on the right of the title.
                    */}
                    <SearchableSelect
                        options={departmentOptions}
                        value={department}
                        onChange={setDepartment}
                        placeholder="All Departments"
                        searchPlaceholder="Search departments..."
                        emptyMessage="No departments found"
                        ariaLabel="Filter by department"
                        className="w-full shrink-0 cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring lg:w-64"
                    />

                </div>

                {loading || scopeLoading ? (

                    <div className="px-4 py-10 sm:px-6">
                        <Loader text="Loading employees..." />
                    </div>

                ) : error ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-16">

                        <div className="ui-tile h-16 w-16 bg-red-50 text-red-600">
                            <FiAlertTriangle size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-bold text-ink sm:text-xl">
                            Failed to Load
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-ink-subtle">
                            {error}
                        </p>

                        <button
                            onClick={() => {
                                setLoading(true);
                                loadEmployees();
                            }}
                            className="ui-btn ui-btn-secondary mt-6 font-semibold"
                        >
                            Retry
                        </button>

                    </div>

                ) : filteredEmployees.length === 0 ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20">

                        <div className="ui-tile h-16 w-16 bg-blue-50 text-blue-600">
                            <FiUsers size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-bold text-ink sm:text-xl">
                            {search || department !== "all"
                                ? "No Matches Found"
                                : "No Employees Yet"}
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-ink-subtle">
                            {search || department !== "all"
                                ? "No employees match your search."
                                : "No employees yet."}
                        </p>

                    </div>

                ) : (

                    <>

                        {/*
                    | Phone view. The table needs roughly 600px before it stops
                    | being a sideways scroll, so below `md` the same rows are
                    | rendered as cards instead. Same array, same page, same
                    | handlers — only the markup differs.
                    */}
                        {/* Tinted behind the cards so the white cards read as
                            separate rows rather than one flat panel. */}
                        <div className="space-y-3 bg-surface-muted/70 p-4 md:hidden">

                            {paginatedEmployees.map((emp) => (
                                <EmployeeCard
                                    key={emp.id}
                                    employee={emp}
                                    onOpen={
                                        canOpenDetails
                                            ? () => navigate(`/employees/details/${emp.id}`)
                                            : undefined
                                    }
                                />
                            ))}

                        </div>

                        {/*
                    | Tablet and desktop. Columns are prioritised rather than all
                    | forced onto a narrow tablet, the same way the payroll and
                    | holiday tables do it: the employee and the status stay at
                    | every width, the rest drop out as the viewport narrows and
                    | reappear inside the employee cell, so nothing is lost.
                    */}
                        <div className="hidden overflow-x-auto md:block">

                            <table className="w-full min-w-[600px] border-collapse lg:min-w-[760px] xl:min-w-[900px]">

                                <thead>

                                    <tr className="border-b border-line-subtle bg-surface-muted text-[11px] uppercase tracking-wider text-ink-faint">

                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee ID</th>
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee Name</th>
                                        <th className="hidden px-4 py-3 text-left font-semibold sm:px-6 lg:table-cell">Email</th>
                                        <th className="hidden px-4 py-3 text-left font-semibold sm:px-6 xl:table-cell">Department</th>
                                        <th className="hidden px-4 py-3 text-left font-semibold sm:px-6 xl:table-cell">Designation</th>
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Status</th>

                                        {canOpenDetails && (
                                            <th className="w-12 px-4 py-3 sm:px-6">
                                                <span className="sr-only">Open</span>
                                            </th>
                                        )}

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-line-subtle">

                                    {paginatedEmployees.map((emp) => (

                                        <tr
                                            key={emp.id}
                                            onClick={
                                                canOpenDetails
                                                    ? () => navigate(`/employees/details/${emp.id}`)
                                                    : undefined
                                            }
                                            className={`group transition-colors hover:bg-surface-muted ${canOpenDetails ? "cursor-pointer" : ""
                                                }`}
                                        >
                                            
                                            <td className="px-4 py-4 text-left text-sm font-semibold text-ink-muted sm:px-6">
                                                {emp.employeeId || placeholder}
                                            </td>

                                            <td className="px-4 py-4 text-left text-sm text-ink-muted sm:px-6 font-bold">
                                                {emp.name || placeholder}
                                            </td>


                                            <td className="hidden px-4 py-4 text-left text-sm text-ink-subtle sm:px-6 lg:table-cell">
                                                {emp.email || placeholder}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-ink-muted sm:px-6 xl:table-cell">
                                                {emp.department || placeholder}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-ink-muted sm:px-6 xl:table-cell">
                                                {emp.designation || placeholder}
                                            </td>

                                            <td className="px-4 py-4 text-left text-sm text-ink-muted sm:px-6">
                                                <EmployeeStatusBadge status={emp.status} />
                                            </td>

                                            {canOpenDetails && (
                                                <td className="w-12 px-4 py-4 text-right sm:px-6">
                                                    <FiChevronRight
                                                        className="ml-auto text-ink-faint transition-colors group-hover:text-brand"
                                                        size={18}
                                                    />
                                                </td>
                                            )}

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                        {/* Pagination sits outside the scrollport, otherwise it slides
                        sideways with the table instead of staying put. */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            startItem={startItem}
                            endItem={endItem}
                            pageSize={pageSize}
                            onPageChange={goToPage}
                            onPageSizeChange={changePageSize}
                        />

                    </>

                )}

            </div>

        </div>
    );
}

export default Employees;

