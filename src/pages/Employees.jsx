import { useNavigate } from "react-router-dom";

function Employees(){
    const navigate = useNavigate();
    return(
        <div className="p-2">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Employees</h1>

                <button onClick={() =>navigate("/employees/add")} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Add Employee</button>
            </div>

        </div>
    );
}
export default Employees;