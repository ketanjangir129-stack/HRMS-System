import { useState } from "react";
import { validateField } from "../../utils/validation/validateField";
import { validateForm } from "../../utils/validation/validateForm";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';


const Login = () => {
  const [formData, setFormData] = useState({
    companyCode: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
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

  const result = await login(
    formData.companyCode,
    formData.email,
    formData.password
  );

  setLoading(false);

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success("Login Successful");

  navigate("/dashboard");
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
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="company@email.com"
                className="w-full border rounded-lg p-3"
              />

              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="********"
                className="w-full border rounded-lg p-3"
              />
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