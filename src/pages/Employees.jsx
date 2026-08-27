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

    const filteredEmployees = searchEmployees(employees, search);
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
    }, [search]);

    const placeholder = <span className="text-slate-300">—</span>;

    return (
        <div className="p-0 space-y-4 sm:p-2 sm:space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
                        <FiUsers />
                    </div>

                    <div className="min-w-0">

                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Employees
                        </h1>

                        <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                            {search ? `${filteredEmployees.length} of ${employees.length} employees`
                                : `${employees.length} total employee${employees.length === 1 ? "" : "s"}`}
                        </p>

                    </div>

                </div>

                {canAdd && (
                    <button
                        type="button"
                        onClick={() => navigate("/employees/add")}
                        title="Add Employee"
                        aria-label="Add Employee"
                        className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
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
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                            Employees List
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            {isScoped
                                ? "Everyone in the departments you manage, and their current status."
                                : "Everyone on the company and their current status."}
                        </p>

                    </div>

                </div>

                {loading || scopeLoading ? (

                    <div className="px-4 py-10 sm:px-6">
                        <Loader text="Loading employees..." />
                    </div>

                ) : error ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-16">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <FiAlertTriangle size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                            Failed to Load
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-slate-500">
                            {error}
                        </p>

                        <button
                            onClick={() => {
                                setLoading(true);
                                loadEmployees();
                            }}
                            className="mt-6 cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                            Retry
                        </button>

                    </div>

                ) : filteredEmployees.length === 0 ? (

                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <FiUsers size={28} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                            {search ? "No Matches Found" : "No Employees Yet"}
                        </h3>

                        <p className="mt-2 max-w-sm text-sm text-slate-500">
                            {search
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
                        <div className="space-y-3 p-4 md:hidden">

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

                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee</th>
                                        <th className="px-4 py-3 text-left font-semibold sm:px-6">Employee ID</th>
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

                                <tbody className="divide-y divide-slate-100">

                                    {paginatedEmployees.map((emp) => (

                                        <tr
                                            key={emp.id}
                                            onClick={
                                                canOpenDetails
                                                    ? () => navigate(`/employees/details/${emp.id}`)
                                                    : undefined
                                            }
                                            className={`group transition-colors hover:bg-slate-50 ${canOpenDetails ? "cursor-pointer" : ""
                                                }`}
                                        >

                                            <td className="px-4 py-4 text-left text-sm text-slate-700 sm:px-6">

                                                <div className="flex min-w-0 items-center gap-3">

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                                        {getInitials(emp.name || emp.employeeId) || "--"}
                                                    </div>

                                                    <div className="min-w-0">

                                                        <p className="truncate font-semibold text-slate-800">
                                                            {emp.name || placeholder}
                                                        </p>

                                                        {/*
                                                        | The columns hidden at this width, folded back in. Each
                                                        | line disappears at exactly the breakpoint where its own
                                                        | column appears, so nothing is shown twice.
                                                        */}
                                                        <p className="mt-0.5 truncate text-xs text-slate-500 lg:hidden">
                                                            {emp.email || "--"}
                                                        </p>

                                                        <p className="mt-0.5 truncate text-xs text-slate-400 xl:hidden">
                                                            {[emp.department, emp.designation]
                                                                .filter(Boolean)
                                                                .join(" · ") || "--"}
                                                        </p>

                                                    </div>

                                                </div>

                                            </td>

                                            <td className="px-4 py-4 text-left text-sm font-semibold text-slate-700 sm:px-6">
                                                {emp.employeeId || placeholder}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-slate-500 sm:px-6 lg:table-cell">
                                                {emp.email || placeholder}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-slate-700 sm:px-6 xl:table-cell">
                                                {emp.department ? (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                        {emp.department}
                                                    </span>
                                                ) : (
                                                    placeholder
                                                )}
                                            </td>

                                            <td className="hidden px-4 py-4 text-left text-sm text-slate-700 sm:px-6 xl:table-cell">
                                                {emp.designation || placeholder}
                                            </td>

                                            <td className="px-4 py-4 text-left text-sm text-slate-700 sm:px-6">
                                                <EmployeeStatusBadge status={emp.status} />
                                            </td>

                                            {canOpenDetails && (
                                                <td className="w-12 px-4 py-4 text-right sm:px-6">
                                                    <FiChevronRight
                                                        className="ml-auto text-slate-300 transition-colors group-hover:text-blue-600"
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

