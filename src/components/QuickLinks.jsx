import { useNavigate } from "react-router-dom";
import {
    FaUserTie,
    FaCog,
    FaGlobe,
    FaGraduationCap,
    FaChartBar,
    FaImage,
    FaBuilding,
    FaShieldAlt,
    FaSnowboarding,
    FaTasks,
} from "react-icons/fa";
import {FcLeave } from "react-icons/fc";
import { TbMoneybag } from "react-icons/tb";
function QuickLinks() {
    const navigate = useNavigate();

    const gotoEmployees = () => {
        navigate("/employees");
    };

    const gotodepartment = () => {
        navigate("/departments");
    };
    
    const gotoSalary = () => {
        navigate("/salarydashboard");
    };
   
    const gotoonboard = () => {
        navigate("/OnboardDashboard");
    };
    const gotoattendence = () => {
        navigate("/attendance");
    };
    const gototasks = () => {
        navigate("/tasks");
    };

    return (
        <>



            <div className="dashboard-row">

                {/* Quick find */}
                <div className="bg-white rounded-2xl p-6 shadow-md">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                        Quick Find
                    </h2>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="flex flex-col items-center cursor-pointer" onClick={gotoEmployees}>
                            <FaUserTie className="text-4xl p-3 rounded-xl bg-blue-100 text-blue-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Employees
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer">
                            <FaCog className="text-4xl p-3 rounded-xl bg-green-100 text-green-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Settings
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer" onClick={gotodepartment}>
                            <FaGlobe className="text-4xl p-3 rounded-xl bg-orange-100 text-orange-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Departments
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer" onClick={gotoonboard}>
                            <FaSnowboarding className="text-4xl p-3 rounded-xl bg-red-100 text-red-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                OnBoarding
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer" onClick={gototasks}>
                            <FaTasks className="text-4xl p-3 rounded-xl bg-teal-100 text-teal-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Tasks
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer" onClick={gotoattendence}>
                            <FcLeave className="text-4xl p-3 rounded-xl bg-pink-100 text-pink-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Attendence
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer">
                            <FaBuilding className="text-4xl p-3 rounded-xl bg-cyan-100 text-cyan-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Offices
                            </p>
                        </div>

                        <div className="flex flex-col items-center cursor-pointer" onClick={gotoSalary}>
                            <TbMoneybag className="text-4xl p-3 rounded-xl bg-gray-100 text-gray-600" />
                            <p className="mt-2 text-sm font-medium text-gray-700">
                                Salary
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default QuickLinks;