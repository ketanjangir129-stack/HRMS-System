import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate } from "react-router-dom";

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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Employees</h1>

                <button onClick={() => navigate("/employees/add")} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Add Employee</button>

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