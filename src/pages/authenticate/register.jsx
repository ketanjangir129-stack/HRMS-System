import { useState } from "react";
import { validateField } from "../../utils/validation/validatefield"
import { validateForm } from "../../utils/validation/validateform";
import { registerCompany } from "../../services/companyService";



const Register = () => {
    const [formData, setFormData] = useState({
        companyName: "",
        companyCode: "",
        ownerName: "",
        email: "",
        password: "",
        phone: "",
        address: "",
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    const handleBlur = (e) => {
        const { name, value } = e.target;

        setErrors((prev) => ({
            ...prev,
            [name]: validateField(name, value, formData),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        try {

            await registerCompany(formData);
            console.log("data sent to firebase");
            setFormData({
                companyName: "",
                companyCode: "",
                ownerName: "",
                email: "",
                password: "",
                phone: "",
                address: "",
            });
        } catch (error) {
            console.error(error);
            alert(error.message || "Registration Failed");
        }
        console.log("Form is valid!");
    };


    return (
        <div className="h-screen bg-slate-100 flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-5xl h-[92vh] bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 flex-shrink-0">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                        HRMS
                    </div>

                    <h1 className="mt-4 text-3xl font-bold text-slate-900">
                        Company Registration
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Register your company to access the Human Resource Management System.
                    </p>
                </div>

                {/* Scrollable Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">

                    <form onSubmit={handleSubmit}>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Company Name
                                </label>

                                <input
                                    type="text" 
                                    name="companyName" 
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Wevois Labs Pvt Ltd"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.companyName && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.companyName}
                                    </p>
                                )}
                            </div>

                            {/* Company Code */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Company Code
                                </label>

                                <input
                                    type="text"
                                    name="companyCode"
                                    value={formData.companyCode}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="CMP001"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.companyCode && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.companyCode}
                                    </p>
                                )}
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Owner Name
                                </label>

                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="John Doe"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.ownerName && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.ownerName}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="company@email.com"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="********"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Phone Number
                                </label>

                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="9876543210"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Company Address
                                </label>

                                <textarea
                                    rows="4"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Enter company address"
                                    className="w-full p-4 rounded-xl border border-slate-300 bg-white resize-none focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.address && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.address}
                                    </p>
                                )}
                            </div>

                        </div>

                        <button
                            type="submit"
                            className="w-full h-12 mt-8 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                        >
                            Register Company
                        </button>

                    </form>

                </div>
            </div>
        </div>
    );
};

export default Register;