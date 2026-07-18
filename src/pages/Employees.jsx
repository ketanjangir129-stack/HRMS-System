import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate, useOutletContext } from "react-router-dom";
import {searchEmployees} from "../utils/search/searchEmployees";
import Loader from "../components/common/Loader";

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");

    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {

        const data = await getEmployees(companyCode);

        if (!data) {
            setEmployees([]);
            return;
        }

        const employeeArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
        }));
        setEmployees(employeeArray);
    };

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
                        {employees.map((emp) => (
                            <tr key={emp.id} onClick={() =>navigate(`/employees/details/${emp.id}`)} className="border-t">

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
                        ))}



                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default Employees;
