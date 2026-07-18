import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate } from "react-router-dom";

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        const data = await getEmployees(companyCode);

        if (!data) {
            setEmployees([]);
            setLoading(false);
            return;
        }

        const employeeArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
        }));
        setEmployees(employeeArray);
        setLoading(false);
    };

    // Simple client-side filter on name / id / department
    const filtered = employees.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.personalInfo?.name?.toLowerCase().includes(q) ||
            emp.employmentInfo?.employeeId?.toLowerCase().includes(q) ||
            emp.employmentInfo?.department?.toLowerCase().includes(q)
        );
    });

    const initials = (name = "?") =>
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("") || "?";

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

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-6 py-4 text-center">Employee</th>
                            <th className="px-6 py-4 text-left">Employee ID</th>
                            <th className="px-6 py-4 text-left">Department</th>
                            <th className="px-6 py-4 text-left">Designation</th>
                            <th className="px-6 py-4 text-left">Status</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    Loading employees…
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    {search
                                        ? "No employees match your search."
                                        : "No employees yet. Click “Add Employee” to get started."}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((emp) => {
                                const isActive =
                                    (emp.account?.status || "").toLowerCase() === "active";
                                return (
                                    <tr
                                        key={emp.id}
                                        onClick={() =>
                                            navigate(`/employees/details/${emp.id}`)
                                        }
                                        className="cursor-pointer transition-colors hover:bg-indigo-50/50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                                                    {initials(emp.personalInfo?.name)}
                                                </div>
                                                <span className="font-medium text-gray-800">
                                                    {emp.personalInfo?.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {emp.employmentInfo?.employeeId}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {emp.employmentInfo?.department}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {emp.employmentInfo?.designation}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    isActive
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        isActive
                                                            ? "bg-emerald-500"
                                                            : "bg-gray-400"
                                                    }`}
                                                />
                                                {emp.account?.status || "Unknown"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Employees;
