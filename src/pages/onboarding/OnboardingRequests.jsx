import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getOnboardingRequests } from "../../services/OnboardingService";
import { filterData } from "../../utils/search/filterData";
import Loader from "../../components/common/Loader"

function OnboardingRequests() {

    const companyCode = localStorage.getItem("companyCode");

    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);

    const [filteredRequests, setFilteredRequests] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const loadRequests = async () => {

        setLoading(true);

        try {

            const data =
                await getOnboardingRequests(companyCode);

            setRequests(data);

            setFilteredRequests(data);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            setLoading(false);

        }

    };
    console.log(filteredRequests)
    const getStatusStyle = (status) => {
        switch (status) {

            case "Invitation Sent":
                return "bg-blue-100 text-blue-700";

            case "Pending Approval":
                return "bg-yellow-100 text-yellow-700";

            case "Approved":
                return "bg-green-100 text-green-700";

            case "Rejected":
                return "bg-red-100 text-red-700";

            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    useEffect(() => {
        setFilteredRequests(
            filterData(
                requests,
                search,
                [
                    "employmentInfo.employeeId",
                    "employmentInfo.name",
                    "employmentInfo.department",
                    "employmentInfo.designation",
                ]
            )
        );
    }, [search, requests]);

    if (loading) {

        return (

            <Loader/>

        );

    }
    if (!requests.length) {
        return (
            <div className="text-center mt-20">
                No onboarding requests available.
            </div>
        );
    }
    return (

        <div className="p-6 bg-white rounded-xl shadow">

            <h1 className="text-2xl font-bold mb-6">
                Onboarding Requests
            </h1>

            {/* Search */}
           

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="px-4 py-3 text-center">Employee ID</th>

                            <th className="px-4 py-3  text-center">Name</th>

                            <th className="px-4 py-3  text-center">Department</th>

                            <th className="px-4 py-3  text-center">Designation</th>

                            <th className="px-4 py-3  text-center">Status</th>

                            <th className="px-4 py-3  text-center">Action</th>

                        </tr>

                    </thead>

                    <tbody>
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((request) => (


                                <tr className="hover:bg-gray-50 transition" key={request.id}>

                                    <td className="px-4 py-3 border-b text-center">{request.id}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.employmentInfo.name}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.employmentInfo.department}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.employmentInfo.designation}</td>

                                    <td className="px-4 py-3 border-b text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(request.status)}`}>
                                            {request.status}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 border-b text-center">

                                        <button
                                            onClick={() =>
                                                navigate(`/onboarding/${request.id}`)
                                            }
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Review
                                        </button>

                                    </td>

                                </tr>


                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-6">
                                    No matching records found.
                                </td>
                            </tr>
                        )}
                    </tbody>

                </table>
            </div>

        </div>
    )

}
export default OnboardingRequests;