import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsClockHistory } from "react-icons/bs";
import { TbMoneybagEdit } from "react-icons/tb";
import { getEmployeeWithSalaryStatus, updateSalary } from "../../services/SalaryService";
import { filterData } from "../../utils/search/filterData";
import Loader from "../../components/common/Loader"

function SalaryCRUD() {
    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);

    const [filteredEmployees, setFilteredEmployees] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] =
        useState("All");

    const [statusFilter, setStatusFilter] =
        useState("All");

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const data =
                await getEmployeeWithSalaryStatus(companyCode);
            setEmployees(data);
            setFilteredEmployees(data)
        }
        catch (error) {
            console.error(error);
        }

        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadEmployees();
    }, []);
    const departments = [
        "All",
        ...new Set(
            employees.map((emp) => emp.department)
        ),
    ];
    useEffect(() => {

        let data = filterData(
            employees,
            search,
            [
                "employeeId",
                "name",
                "department",
                "designation",
            ]
        );

        if (departmentFilter !== "All") {
            data = data.filter(
                (emp) => emp.department === departmentFilter
            );
        }

        if (statusFilter !== "All") {
            data = data.filter((emp) =>
                statusFilter === "Assigned"
                    ? emp.salaryAssigned
                    : !emp.salaryAssigned
            );
        }

        setFilteredEmployees(data);

    }, [
        employees,
        search,
        departmentFilter,
        statusFilter,
    ]);
    if (loading) {
        return (
            <div className="p-8 w-full h-full">
                <Loader text="Loading employees..." />
            </div>
        )
    };

    if (!employees.length) {
        return (

            <div className="text-center mt-20">
                No employees found.
            </div>
        );
    }

    return (

        <div><div className="p-6 bg-white rounded-xl shadow">
            <div className="mb-10 text-sm pl-[2px]">
                <h1 className="text-2xl font-bold mb-2">

                    Create & Update Salaries
                </h1>
                <p>create new entries or update existing ones here.</p>
            </div>




            <div className="flex flex-col md:flex-row gap-4 mb-6">

                <input
                    type="text"
                    placeholder="Search Employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border rounded-lg px-4 py-2 w-full md:w-80"
                />

                <select
                    value={departmentFilter}
                    onChange={(e) =>
                        setDepartmentFilter(e.target.value)
                    }
                    className="border rounded-lg px-4 py-2"
                >
                    {departments.map((department) => (
                        <option
                            key={department}
                            value={department}
                        >
                            {department}
                        </option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value)
                    }
                    className="border rounded-lg px-4 py-2"
                >
                    <option value="All">
                        All Status
                    </option>

                    <option value="Assigned">
                        Assigned
                    </option>

                    <option value="Not Assigned">
                        Not Assigned
                    </option>

                </select>

            </div>
            <div className="overflow-x-auto">

                <div className="max-h-[450px] overflow-y-auto hide-scrollbar">
                    <table className="min-w-full border-collapse ">

                        <thead className="sticky top-0 z-20 bg-white shadow-sm">

                            <tr>

                                <th className="px-4 py-3 text-center bg-white">Employee ID</th>

                                <th className="px-4 py-3 text-center bg-white">Name</th>

                                <th className="px-4 py-3 text-center bg-white">Department</th>

                                <th className="px-4 py-3 text-center bg-white">Designation</th>

                                <th className="px-4 py-3 text-center bg-white">Status</th>

                                <th className="px-4 py-3 text-center bg-white">Action</th>

                            </tr>

                        </thead>

                        <tbody className="text-sm ">
                            {

                                filteredEmployees.map((employee) => (

                                    <tr
                                        key={employee.employeeId}
                                        className="hover:bg-gray-50 p-2 border-b  border-gray-200"
                                    >

                                        <td className="text-center text-gray-600 font-semibold pt-3 pb-2">{employee.employeeId}</td>

                                        <td className="text-center text-gray-600  pt-3 pb-2">{employee.name}</td>

                                        <td className="text-center text-gray-600  pt-3 pb-2">{employee.department}</td>

                                        <td className="text-center text-gray-600  pt-3 pb-2">{employee.designation}</td>
                                        <td className="text-center text-gray-600  pt-3 pb-2">

                                            <span
                                                className={`px-3 py-1 rounded-full text-sm

${employee.salaryAssigned

                                                        ? "bg-green-100 text-green-700"

                                                        : "bg-yellow-100 text-yellow-700"

                                                    }`}

                                            >

                                                {employee.salaryAssigned

                                                    ? "Assigned"

                                                    : "Not Assigned"

                                                }

                                            </span>

                                        </td>
                                        <td className="text-center pt-3 pb-2">

                                            {

                                                employee.salaryAssigned ?

                                                    (
                                                        <div className="flex gap-2 items-center justify-center">
                                                            <button

                                                                className="px-2 py-2 rounded-lg"

                                                                onClick={() =>

                                                                    navigate(

                                                                        `/salarydashboard/salary/edit/${employee.employeeId}`

                                                                    )

                                                                }
                                                                title="Edit Employee Salary"

                                                            >

                                                                <TbMoneybagEdit size={20}
                                                                    className="text-blue-600" />

                                                            </button>
                                                            <button
                                                                className="px-3 py-2"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/salarydashboard/salary/history/${employee.employeeId}`
                                                                    )
                                                                }
                                                                title="Check Salary History"
                                                            >
                                                                <BsClockHistory
                                                                    size={20}
                                                                    className="text-blue-600"
                                                                />
                                                            </button>
                                                        </div>


                                                    )

                                                    :

                                                    (

                                                        <button

                                                            className="px-2 py-2 bg-green-600 text-white rounded-lg"

                                                            onClick={() =>

                                                                navigate(

                                                                    `/salarydashboard/salary/create/${employee.employeeId}`

                                                                )

                                                            }
                                                            title="Assign Salary to Employee"

                                                        >

                                                            Assign Salary

                                                        </button>

                                                    )

                                            }

                                        </td>
                                    </tr>
                                )
                                )
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>
    )
}
export default SalaryCRUD; 