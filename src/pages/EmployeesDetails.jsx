import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployeeById } from "../services/EmployeeService";
function EmployeesDetails() {
    const companyCode = localStorage.getItem("companyCode");
    const { id } = useParams();
    const [employee, setEmployee] = useState(null);
    useEffect(() => {
        loadEmployee();
    }, []);

    const loadEmployee = async () => {

        const data = await getEmployeeById(
            companyCode,
            id
        );

        setEmployee(data);
    };
    if (!employee) {
        return <h2>Loading...</h2>;
        { employee.employeeId }
        { employee.name }
        { employee.email }
        { employee.mobile }
        { employee.department }
        { employee.designation }
        { employee.address }
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow">
            <h1 className="text-3xl font-bold mb-6">Employee Details</h1>

            <div className="space-y-4">

                <p>
                    <strong>Employee ID :</strong> {employee.employeeId}
                </p>

                <p>
                    <strong>Name :</strong> {employee.name}
                </p>

                <p>
                    <strong>Email :</strong> {employee.email}
                </p>

                <p>
                    <strong>Mobile :</strong> {employee.mobile}
                </p>

                <p>
                    <strong>Department :</strong> {employee.department}
                </p>

                <p>
                    <strong>Designation :</strong> {employee.designation}
                </p>

                <p>
                    <strong>Address :</strong> {employee.address}
                </p>

            </div>

        </div>


    );
}
export default EmployeesDetails;