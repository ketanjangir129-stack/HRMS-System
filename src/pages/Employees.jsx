import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate,useOutletContext } from "react-router-dom";
import { searchEmployees } from "../utils/search/searchEmployees";
import Loader from "../components/common/Loader";
import { UserPlus } from "lucide-react";

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");
 
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const {search,setSearch,setSearchPlaceholder} = useOutletContext();
 
 
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
 
    return (
        <div className="p-6 bg-white rounded-xl shadow">

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {search ? `${filteredEmployees.length} of ${employees.length} employees`
                        : `${employees.length} total employee${employees.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                <button
                    onClick={() => navigate("/employees/add")}
                    title="Add Employee"
                    aria-label="Add Employee"
                    className="group inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 active:translate-y-0"
                >
                    <UserPlus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">

                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-center">Employee ID</th>
                            <th className="px-4 py-3 text-center">Name</th>
                            <th className="px-4 py-3 text-center">Email</th>
                            <th className="px-4 py-3 text-center">Department</th>
                            <th className="px-4 py-3 text-center">Designation</th>
                            <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12">
                                    <Loader text="Loading employees..." />
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    {search
                                        ? "No employees match your search."
                                        : "No employees yet."}
                                </td>
                            </tr>
                        ) : (
                        filteredEmployees.map((emp) => (
                            <tr
                                key={emp.id}
                                onClick={() => navigate(`/employees/details/${emp.id}`)}
                                className="hover:bg-gray-50 transition cursor-pointer"
                            >
                                <td className="px-4 py-3 border-b text-center">
                                    {emp.employeeId || <span className="text-gray-300">—</span>}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.name || <span className="text-gray-300">—</span>}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.email || <span className="text-gray-300">—</span>}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.department || <span className="text-gray-300">—</span>}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.designation || <span className="text-gray-300">—</span>}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                            emp.status.toLowerCase() === "active"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-rose-50 text-rose-700"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                emp.status.toLowerCase() === "active"
                                                    ? "bg-emerald-500"
                                                    : "bg-rose-500"
                                            }`}
                                        />
                                        {emp.status}
                                    </span>
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
 
