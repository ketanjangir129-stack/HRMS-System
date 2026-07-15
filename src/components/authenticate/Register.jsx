import { useState } from "react";
import { validateField } from "../../utils/validation/validatefield"
import { validateForm } from "../../utils/validation/validateform";



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

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = validateForm(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        console.log("Form is valid!");
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8">

                <h1 className="text-3xl font-bold text-center mb-2">
                    Company Registration
                </h1>

                <p className="text-center text-gray-500 mb-8">
                    Register your company to start using the HRMS.
                </p>

                <form onSubmit={handleSubmit}>

                    {/* Company Name */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Company Name
                        </label>

                        <input
                            type="text"
                             name="companyName"
                             value={formData.companyName}
                             onChange={handleChange}
                            onBlur={handleBlur}

                        
                            placeholder="wevois labs pvt ltd"
                            className="w-full border rounded-lg p-3"
                        />

                        {errors.companyName && (
                            <p className="text-red-500 text-sm">
                                {errors.companyName}
                            </p>)}
                    </div>

                    {/* Company Code */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Company Code
                        </label>

                        <input
                            type="text"
                            placeholder="ABC001"
                            name="companyCode"
                            value={formData.companyCode}
                            className="w-full border rounded-lg p-3" value={formData.companyCode}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />

                        {errors.companyCode && (
                            <p className="text-red-500 text-sm">
                                {errors.companyCode}
                            </p>)}
                    </div>

                    {/* Owner Name */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Owner Name
                        </label>

                        <input
                            type="text"
                            placeholder="John Doe"
                            name="ownerName"
                            className="w-full border rounded-lg p-3"
                            value={formData.ownerName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {errors.ownerName && (
                            <p className="text-red-500 text-sm">
                                {errors.ownerName}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Email
                        </label>

                        <input
                            type="email"
                            name="email"
                            placeholder="company@email.com"
                            className="w-full border rounded-lg p-3"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm">
                                {errors.email}
                            </p>
                        )}
                    </div>
                    {/* Password */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="********"
                            name="password"
                            className="w-full border rounded-lg p-3"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Phone
                        </label>

                        <input
                            type="text"
                            name="phone"
                            placeholder="9876543210"
                            className="w-full border rounded-lg p-3"
                        value={formData.phone}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-sm">
                                {errors.phone}
                            </p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Address
                        </label>

                        <textarea
                            rows="3"
                            placeholder="Company Address"
                            name="address"
                            className="w-full border rounded-lg p-3"
                       value={formData.address}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {errors.address && (
                            <p className="text-red-500 text-sm">
                                {errors.address}
                            </p>
                        )}
                    </div>



                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
                    >
                        Register Company
                    </button>

                </form>

            </div>
        </div>
    );
};

export default Register;