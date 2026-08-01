import { useNavigate } from "react-router-dom";
import { UserPlus, ClipboardList, ClipboardClock } from "lucide-react";
import { TbReportMoney } from "react-icons/tb";
function OnboardingDashboard() {

    const navigate = useNavigate();

    return (

        <div className="p-8">

            <h1 className="text-3xl font-bold">
                Salary Management
            </h1>

            <p className="text-gray-500 mt-2 mb-8">
                Manage All Employees Salarys Here
            </p>

            <div className="grid md:grid-cols-2 gap-6">

                {/* Create Salary */}

                <div
                    onClick={() => navigate("/salarydashboard/salary")}
                    className="cursor-pointer bg-white rounded-2xl shadow p-8 hover:shadow-lg transition"
                >

                    <TbReportMoney
                        size={40}
                        className="text-blue-600"
                    />

                    <h2 className="text-xl font-semibold mt-4">
                        Create & Update Salary's
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Create and Update the Salary of Employees.
                    </p>

                </div>

            
            </div>

        </div>

    );

}

export default OnboardingDashboard;