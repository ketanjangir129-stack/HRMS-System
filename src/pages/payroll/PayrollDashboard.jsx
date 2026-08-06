function PayrolllDashboard() {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">
                Payroll Dashboard
            </h1>
            {/* total count cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-white rounded-xl shadow p-6">

                    <h3 className="text-gray-500">

                        Total Employees

                    </h3>

                    <p className="text-3xl font-bold">

                        0
                    </p>

                </div>

                <div className="bg-white rounded-xl shadow p-6">

                    <h3 className="text-gray-500">

                        Generated

                    </h3>

                    <p className="text-3xl font-bold text-green-600">

                        0

                    </p>

                </div>

                <div className="bg-white rounded-xl shadow p-6">

                    <h3 className="text-gray-500">

                        Pending

                    </h3>

                    <p className="text-3xl font-bold text-yellow-600">

                        0

                    </p>

                </div>

            </div>
            {/* month section */}
            <div className="flex justify-between items-center">

                <div>

                    <label className="font-medium">

                        Payroll Month

                    </label>

                    <input
                        type="month"
                        className="border rounded-lg px-3 py-2 ml-3"
                    />

                </div>

                <button
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >

                    Generate Payroll

                </button>

            </div>
            {/* search filters */}
            <div className="flex gap-4">

                <input
                    type="text"
                    placeholder="Search Employee..."
                    className="flex-1 border rounded-lg px-4 py-2"
                />

                <select
                    className="border rounded-lg px-4 py-2"
                >

                    <option>All</option>

                    <option>Generated</option>

                    <option>Pending</option>

                </select>

            </div>
            {/* employee table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="p-3 text-left">Employee ID</th>

                            <th className="p-3 text-left">Name</th>

                            <th className="p-3 text-left">Department</th>

                            <th className="p-3 text-left">Status</th>

                            <th className="p-3 text-center">Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        <tr>

                            <td className="p-3">

                                EMP001

                            </td>

                            <td className="p-3">

                                John Doe

                            </td>

                            <td className="p-3">

                                IT

                            </td>

                            <td className="p-3">

                                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">

                                    Pending

                                </span>

                            </td>

                            <td className="p-3 text-center">

                                <button className="px-4 py-2 bg-green-600 text-white rounded-lg">

                                    Generate

                                </button>

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>
        </div>
    )
}

export default PayrolllDashboard;