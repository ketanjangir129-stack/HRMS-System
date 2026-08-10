import { useState } from "react";
import { validateField } from "../../utils/validation/validateField";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { Building2, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";


const Login = () => {
  const [formData, setFormData] = useState({
    companyCode: "",
    userId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  // Shared input styling: the error state only swaps the border/ring colour so
  // every field keeps the same shape as the rest of the app's forms.
  const inputClass = (hasError) =>
    `w-full h-12 pl-11 pr-4 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
    }`;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  // On login we only check that a password was entered — the password-strength
  // pattern is for creation, not for verifying an existing password.
  const validateLoginField = (name, value) => {
    if (name === "password") {
      return String(value ?? "").trim() ? "" : "This field is required.";
    }
    return validateField(name, value, formData);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validateLoginField(name, value),
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    Object.entries(formData).forEach(([name, value]) => {
      const error = validateLoginField(name, value);
      if (error) {
        validationErrors[name] = error;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await login(
        formData.companyCode.trim().toUpperCase(),
        formData.userId.trim(),
        formData.password
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Login Successful");

      // HR / Employee must set a new password before entering the app.
      if (result.role !== "owner" && !result.isPasswordChanged) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 sm:p-6">

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2">

        {/* Brand panel — decorative, so it drops away on small screens */}
        <div className="relative hidden md:flex flex-col justify-between bg-blue-600 p-10 overflow-hidden">

          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="text-white text-xl font-bold">H</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white leading-none">
                HRMS
              </h2>

              <p className="text-xs text-blue-100 mt-1">
                Workforce Management
              </p>
            </div>
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Everything your team needs, in one place.
            </h2>

            <p className="mt-3 text-blue-100 leading-relaxed">
              Attendance, payroll, leaves and onboarding — managed from a single
              dashboard.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-sm text-blue-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Secure, company-scoped access</span>
          </div>

        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">

          {/* header */}
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
              HRMS
            </div>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              Company Login
            </h1>

            <p className="mt-2 text-slate-500">
              Login to your HRMS account to continue.
            </p>
          </div>

          {/* body */}
          <form onSubmit={handleSubmit} className="mt-8">

            {/* Company Code */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Code
              </label>

              <div className="relative">
                <Building2
                  className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />

                <input
                  type="text"
                  name="companyCode"
                  value={formData.companyCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="ABC001"
                  className={inputClass(errors.companyCode)}
                />
              </div>

              {errors.companyCode && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.companyCode}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>

              <div className="relative">
                <User
                  className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />

                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Owner Email or Employee ID"
                  className={inputClass(errors.userId)}
                />
              </div>

              {errors.userId && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.userId}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <Lock
                  className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="********"
                  className={`${inputClass(errors.password)} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition-colors hover:text-blue-600 cursor-pointer rounded-r-xl"
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

            <button
              type="submit"
              disabled={loading}
              className={`
                  w-full h-12 rounded-xl text-white font-medium
                  transition-all duration-200
                  ${loading
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">

                  <svg
                    className="w-5 h-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>

                  <span>Signing In...</span>

                </div>
              ) : (
                "Login"
              )}
            </button>

          </form>

          <div className="mt-6 flex items-center justify-center gap-1 text-sm">
            <span className="text-slate-500">Don't have an account?</span>

            <button
              onClick={() => navigate("/")}
              className="text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
            >
              Register
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
