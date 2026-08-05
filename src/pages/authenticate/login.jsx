import { useState } from "react";
import { validateField } from "../../utils/validation/validateField";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { Eye, EyeOff } from "lucide-react";


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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        {/* header */}
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Company Login
          </h1>

          <p className="text-center text-gray-500 mb-8">
            Login to your HRMS account
          </p>
        </div>
        <div>
          {/* body */}
          <form onSubmit={handleSubmit}>

            {/* Company Code */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                Company Code
              </label>

              <input
                type="text"
                name="companyCode"
                value={formData.companyCode}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="ABC001"
                className="w-full border rounded-lg p-3"
              />
              {errors.companyCode && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.companyCode}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                Email
              </label>

              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Owner Email or Employee ID"
                className="w-full border rounded-lg p-3"
              />

              {errors.userId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.userId}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
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
                  className="w-full border rounded-lg p-3 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 transition-colors hover:text-blue-600 cursor-pointer rounded-r-lg"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`
                  w-full py-3 rounded-lg text-white font-medium
                  transition-all duration-200
                  ${loading
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
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
        </div>
        <div className="p-[5px] m-[5px] ">
          <p className="mt-4 text-center">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/")}
            >
              Register
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
