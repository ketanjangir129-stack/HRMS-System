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
                        employee.employmentInfo?.name ||
                        "",

                        email:
                        employee.basic?.email ||
                        employee.personalInfo?.email ||
                        employee.employmentInfo?.email ||
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
                        {employees.length} total employee
                        {employees.length === 1 ? "" : "s"}
                    </p>
                </div>

                <button
                    onClick={() => navigate("/employees/add")}
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
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12">
                                    <Loader text="Loading employees..." />
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
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
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
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
                                    {emp.employeeId}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.name}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.email}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
                                    {emp.department}
                                </td>

                                <td className="px-4 py-3 border-b text-center">
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
 
