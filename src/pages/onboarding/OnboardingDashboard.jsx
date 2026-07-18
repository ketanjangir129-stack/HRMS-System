import { useNavigate } from "react-router-dom";
import { UserPlus, ClipboardList } from "lucide-react";

function OnboardingDashboard() {

    const navigate = useNavigate();

    return (

        <div className="p-8">

            <h1 className="text-3xl font-bold">
                Employee Onboarding
            </h1>

            <p className="text-gray-500 mt-2 mb-8">
                Manage employee onboarding requests.
            </p>

            <div className="grid md:grid-cols-2 gap-6">

                {/* Create Invitation */}

                <div
                    onClick={() => navigate("/OnboardDashboard/OnBoardForm")}
                    className="cursor-pointer bg-white rounded-2xl shadow p-8 hover:shadow-lg transition"
                >

                    <UserPlus
                        size={40}
                        className="text-blue-600"
                    />

                    <h2 className="text-xl font-semibold mt-4">
                        Onboard Employee
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Create an onboarding invitation for a new employee.
                    </p>

                </div>

                {/* Requests */}

                <div
                    onClick={() => navigate("/OnboardDashboard/OnBoardRequest")}
                    className="cursor-pointer bg-white rounded-2xl shadow p-8 hover:shadow-lg transition"
                >

                    <ClipboardList
                        size={40}
                        className="text-green-600"
                    />

                    <h2 className="text-xl font-semibold mt-4">
                        Onboarding Requests
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Review and approve employee onboarding requests.
                    </p>

                </div>

            </div>

        </div>

    );

}

export default OnboardingDashboard;