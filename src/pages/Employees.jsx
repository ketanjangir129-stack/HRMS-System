import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate } from "react-router-dom";
import { searchEmployees } from "../utils/search/searchEmployees";
import Loader from "../components/common/Loader";

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");

    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadEmployees = async () => {
        setError("");

        try {
            const data = await getEmployees(companyCode);

            // Flatten the nested sections so the table and searchEmployees
            // can read plain fields (name, employeeId, department, designation)
            const employeeArray = Object.keys(data).map((key) => {
                const employee = data[key];

                return {
                    id: key,

                    employeeId:
                        employee.basic?.employeeId ||
                        employee.employmentInfo?.employeeId ||
                        "",

                    name:
                        employee.basic?.name ||
                        employee.personalInfo?.name ||
                        "",

                    department:
                        employee.basic?.department ||
                        employee.employmentInfo?.department ||
                        "",

                    designation:
                        employee.basic?.designation ||
                        employee.employmentInfo?.designation ||
                        "",
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
    return (
        <div className="p-2">

            {/* Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Employees</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {employees.length} total employee
                        {employees.length === 1 ? "" : "s"}
                    </p>
                </div>

                <button
                    onClick={() => navigate("/employees/add")}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                    <span className="text-lg leading-none">+</span>
                    Add
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4 max-w-sm">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                </span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, ID or department…"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
            </div>
            <div className="bg-white rounded-xl shadow mt-6 overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left">Employee ID</th>
                            <th className="px-6 py-4 text-left">Name</th>
                            <th className="px-6 py-4 text-left">Department</th>
                            <th className="px-6 py-4 text-left">Designation</th>

                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12">
                                    <Loader text="Loading employees..." />
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <p className="text-red-600">{error}</p>
                                    <button
                                        onClick={() => {
                                            setLoading(true);
                                            loadEmployees();
                                        }}
                                        className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                        Retry
                                    </button>
                                </td>
                            </tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                    {search
                                        ? "No employees match your search."
                                        : "No employees yet."}
                                </td>
                            </tr>
                        ) : (
                        filteredEmployees.map((emp) => (
                            <tr key={emp.id} onClick={() =>navigate(`/employees/details/${emp.id}`)} className="border-t cursor-pointer hover:bg-gray-50">

                                <td className="px-6 py-4">
                                    {emp.employeeId}
                                </td>

                                <td className="px-6 py-4">
                                    {emp.name}
                                </td>

                                <td className="px-6 py-4">
                                    {emp.department}
                                </td>

                                <td className="px-6 py-4">
                                    {emp.designation}
                                </td>
                            </tr>
                        ))
                        )}
                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default Employees;
