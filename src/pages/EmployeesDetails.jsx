import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployeeById } from "../services/EmployeeService";
function EmployeesDetails(){
    const companyCode = localStorage.getItem("companyCode");
    const [employee, setEmployee] = useState(null);
    const {id} = useParams();
    return(
        <div className="bg-white p-8 rounded-xl shadow">
            <h1 className="text-3xl font-bold mb-6">Employee Details</h1>

            <p>Employee details will come here...</p>
            
        </div>


    );
}
export default EmployeesDetails;