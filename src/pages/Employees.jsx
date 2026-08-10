import { useEffect, useState } from "react";
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
import  usePagination  from "../hooks/usePagination";
import Pagination from "../components/common/pagination/Pagination";

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

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { search, setSearch, setSearchPlaceholder } = useOutletContext();


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
            setEmployees(employeeArray);
        } catch (err) {
            console.error("Failed to load employees:", err);
            setEmployees([]);
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
        <div className="p-2 space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
                        <FiUsers />
                    </div>

                    <div>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Employees
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
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
                        className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
                    >
                        <FiUserPlus
                            size={18}
                            className="transition-transform duration-200 group-hover:scale-110"
                        />
                        Add Employee
                    </button>
                )}

            </div>

            {/* Directory */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                        <h2 className="text-lg font-semibold text-slate-900">
                            Employees List
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Everyone on the company and their current status.
                        </p>

                    </div>

                </div>

                {loading ? (

                    <div className="px-6 py-10">
                        <Loader text="Loading employees..." />
                    </div>

                ) : error ? (

                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center sm:py-16">

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

                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center sm:py-20">

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

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[900px] border-collapse">

                            <thead>

                                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                    <th className="px-6 py-3 text-left font-semibold">Employee ID</th>
                                    <th className="px-6 py-3 text-left font-semibold">Employee</th>
                                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                                    <th className="px-6 py-3 text-left font-semibold">Department</th>
                                    <th className="px-6 py-3 text-left font-semibold">Designation</th>
                                    <th className="px-6 py-3 text-left font-semibold">Status</th>

                                    {canOpenDetails && (
                                        <th className="w-12 px-6 py-3">
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

                                        <td className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                                            {emp.employeeId || placeholder}
                                        </td>

                                        <td className="px-6 py-4 text-left text-sm text-slate-700">

                                            <div className="flex min-w-0 items-center gap-3">

                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                                    {getInitials(emp.name || emp.employeeId) || "--"}
                                                </div>

                                                <p className="truncate font-semibold text-slate-800">
                                                    {emp.name || placeholder}
                                                </p>

                                            </div>

                                        </td>

                                        <td className="px-6 py-4 text-left text-sm text-slate-500">
                                            {emp.email || placeholder}
                                        </td>

                                        <td className="px-6 py-4 text-left text-sm text-slate-700">
                                            {emp.department ? (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {emp.department}
                                                </span>
                                            ) : (
                                                placeholder
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-left text-sm text-slate-700">
                                            {emp.designation || placeholder}
                                        </td>

                                        <td className="px-6 py-4 text-left text-sm text-slate-700">

                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${emp.status.toLowerCase() === "active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-rose-50 text-rose-700"
                                                    }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${emp.status.toLowerCase() === "active"
                                                            ? "bg-emerald-500"
                                                            : "bg-rose-500"
                                                        }`}
                                                />
                                                {emp.status}
                                            </span>

                                        </td>

                                        {canOpenDetails && (
                                            <td className="w-12 px-6 py-4 text-right">
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
                        {/* Pagination */}
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
                    </div>

                )}

            </div>

        </div>
    );
}

export default Employees;

