import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import {getOnboardingRequestById} from "../../services/OnboardingService"

function ReviewOnboarding() {
    const { requestId } = useParams();
    const [request, setRequest] = useState(null);

    const [loading, setLoading] = useState(true);

    const companyCode = localStorage.getItem("companyCode");

    useEffect(() => {

        loadRequest();

    }, []);
    const loadRequest = async () => {

        try {

            const data =
                await getOnboardingRequestById(
                    companyCode,
                    requestId
                );

            setRequest(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };
    if (loading) {

        return (

            <div className="p-8">

                Loading...

            </div>

        );

    }
    if (!request) {

        return (

            <div className="p-8">

                Request not found.

            </div>

        );

    }
    return (
        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-semibold mb-6">

                Basic Information

            </h2>

            <div className="grid grid-cols-2 gap-6">

                <div>

                    <label className="font-medium">

                        Employee ID

                    </label>

                    <input

                        value={request.id}

                        readOnly

                        className="w-full border rounded-lg p-3"

                    />

                </div>

                <div>

                    <label className="font-medium">

                        Employee Name

                    </label>

                    <input

                        value={request.basic.name}

                        readOnly

                        className="w-full border rounded-lg p-3"

                    />

                </div>

                <div>

                    <label className="font-medium">

                        Email

                    </label>

                    <input

                        value={request.basic.email}

                        readOnly

                        className="w-full border rounded-lg p-3"

                    />

                </div>

                <div>

                    <label className="font-medium">

                        Mobile

                    </label>

                    <input

                        value={request.basic.mobile}

                        readOnly

                        className="w-full border rounded-lg p-3"

                    />

                </div>

            </div>
            <div className="flex justify-end gap-4 mt-8">

                <button

                    className="px-6 py-3 bg-red-600 text-white rounded-lg"

                >

                    Reject

                </button>

                <button

                    className="px-6 py-3 bg-green-600 text-white rounded-lg"

                >

                    Approve

                </button>

            </div>

        </div>



    )

}
export default ReviewOnboarding;
