import { useEffect, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import { useNavigate, useOutletContext } from "react-router-dom";
import {searchEmployees} from "../utils/search/searchEmployees";
import Loader from "../components/common/Loader";

function Employees() {
    const navigate = useNavigate();
    const companyCode = localStorage.getItem("companyCode");
    const [employees, setEmployees] = useState([]);
    const {search,setSearchPlaceholder} = useOutletContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);

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
        } catch (error) {
            console.error("Error loading employees:", error);
        } finally {
            setLoading(false);
        }
    };

    //filtering employees
    const filteredEmployees =searchEmployees(
        employees,
        search
    );
    //setting placeholder for search bar
    useEffect(() => {
        setSearchPlaceholder("Search Employee name or Employee Id");
        return () => {
            setSearchPlaceholder("Search...");
        };

    }, []);


    if (loading) {
        return (
            <Loader text="Loading Employees..." />
        );
    }

    return (
        <div className="p-2">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Employees</h1>

                <button onClick={() => navigate("/employees/add")} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Add Employee</button>

            </div>
            {
                filteredEmployees.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-300 p-10 text-center">

                        <h3 className="text-lg font-semibold">
                            No Employees Found
                        </h3>

                        <p className="text-slate-500 mt-2">
                            Try another search term.
                        </p>

                    </div>
                )
            }
            {
                filteredEmployees.length > 0 && (
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
                                {filteredEmployees.map((emp) => (
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
                )
            }

        </div>
    );
}

export default Employees;