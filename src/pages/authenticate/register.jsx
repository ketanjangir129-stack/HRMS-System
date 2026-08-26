import { useState } from "react";
import { validateField } from "../../utils/validation/validateField"
import { validateForm } from "../../utils/validation/validateForm";
import { registerCompany } from "../../services/authService";
import {
    checkCompanyCodeExists,
    createCompany,
} from "../../services/companyService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";


const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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
    const [showPassword, setShowPassword] = useState(false);

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

    setLoading(true);

    try {
      // Convert company code to uppercase
      const companyCode = formData.companyCode.trim().toUpperCase();
      // Check company code
      const exists = await checkCompanyCodeExists(companyCode);

      if (exists) {
        setErrors({
          companyCode: "Company Code already exists.",
        });
        return;
      }

      // Firebase Authentication
      const authResult = await registerCompany(
        formData.email,
        formData.password
      );
      
      if (!authResult.success) {
        alert(authResult.message);
        return;
      }

      // Company Data
      const companyData = {
        ownerUid: authResult.user.uid,
        companyName: formData.companyName.trim(),
        companyCode,
        ownerName: formData.ownerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      };

      // Save Company
      const companyResult = await createCompany(companyData);

      if (!companyResult.success) {
        alert(companyResult.message);
        return;
      }

      alert("Company Registered Successfully.");

      await new Promise((resolve) => setTimeout(resolve, 700));
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

      

    return (
        <div className="h-screen bg-canvas flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-5xl h-[92vh] bg-surface rounded-3xl shadow-xl border border-line flex flex-col">

                {/* Header */}
                <div className="px-8 py-6 border-b border-line flex-shrink-0">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                        HRMS
                    </div>

                    <h1 className="mt-4 text-3xl font-bold text-ink">
                        Company Registration
                    </h1>

                    <p className="mt-2 text-ink-subtle">
                        Register your company to access the Human Resource Management System.
                    </p>
                </div>

                {/* Scrollable Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">

                    <form onSubmit={handleSubmit}>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Company Name
                                </label>

                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Wevois Labs Pvt Ltd"
                                    className="w-full h-12 px-4 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.companyName && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.companyName}
                                    </p>
                                )}
                            </div>

                            {/* Company Code */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Company Code
                                </label>

                                <input
                                    type="text"
                                    name="companyCode"
                                    value={formData.companyCode}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="CMP001"
                                    className="w-full h-12 px-4 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.companyCode && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.companyCode}
                                    </p>
                                )}
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Owner Name
                                </label>

                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="John Doe"
                                    className="w-full h-12 px-4 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.ownerName && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.ownerName}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="company@email.com"
                                    className="w-full h-12 px-4 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="********"
                                        className="w-full h-12 pl-4 pr-12 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        aria-pressed={showPassword}
                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-subtle transition-colors hover:text-brand cursor-pointer rounded-r-xl"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-5 w-5" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>

                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Phone Number
                                </label>

                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="9876543210"
                                    className="w-full h-12 px-4 rounded-xl border border-line bg-surface focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                />

                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-ink-muted mb-2">
                                    Company Address
                                </label>

                                <textarea
                                    rows="4"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Enter company address"
                                    className="w-full p-4 rounded-xl border border-line bg-surface resize-none focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
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
                            disabled={loading}
                            className={`
                                w-full h-12 mt-6 rounded-xl
                                text-white font-medium
                                transition-all duration-200
                                ${
                                    loading
                                        ? "bg-blue-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }
                            `}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">

                                    <svg
                                        className="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                            className="opacity-25"
                                        />
                                        <path
                                            fill="currentColor"
                                            className="opacity-75"
                                            d="M12 2a10 10 0 00-10 10h4a6 6 0 016-6V2z"
                                        />
                                    </svg>

                                    <span>Registering...</span>

                                </div>
                            ) : (
                                "Register Company"
                            )}
                        </button>

                    </form>

                    <div className="flex justify-center mt-3">
                        <h1 className="font-semibold text-md text-ink-muted">Already have an account ?</h1>
                        <button
                            onClick={() => navigate("/login")}
                            className="text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
                        >
                            Login
                        </button>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default Register;