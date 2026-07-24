import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {getOnboardingHistory } from "../../services/OnboardingService";

import { filterData } from "../../utils/search/filterData";
import Loader from "../../components/common/Loader"

function Onboardinghistory() {

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
                await getOnboardingHistory(companyCode);

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
                    "basic.employeeId",
                    "basic.name",
                    "basic.department",
                    "basic.designation",
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
                Onboarding History
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

                            <th className="px-4 py-3  text-center">Approved By</th>

                        </tr>

                    </thead>

                    <tbody>
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((request) => (


                                <tr className="hover:bg-gray-50 transition" key={request.id}>

                                    <td className="px-4 py-3 border-b text-center">{request.id}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.request.employmentInfo.name}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.request.employmentInfo.department}</td>

                                    <td className="px-4 py-3 border-b text-center">{request.request.employmentInfo.designation}</td>
                                    

                                    <td className="px-4 py-3 border-b text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(request.action)}`}>
                                            {request.action}
                                        </span>
                                    </td>

                                  <td className="px-4 py-3 border-b text-center">{request.approvedBy
}</td>

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
export default Onboardinghistory;