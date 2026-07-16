import { useState } from "react";
import { validateField } from "../../utils/validation/validatefield";
import { validateForm } from "../../utils/validation/validateform";
import useAuth from "../../hooks/useAuth";
// import { useNavigate } from "react-router-dom";


const Login = () => {
  const [formData, setFormData] = useState({
    companyCode: "",
    email: "",
    password: "",
  });
  const { login } = useAuth();
  // const navigate = useNavigate();

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

    const result = await login(
      formData.email,
      formData.password,
      formData.companyCode
    );

    if (!result.success) {
      alert(result.message);
      return;
    }

    //   navigate("/dashboard");
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
            >
              Login
            </button>

          </form>
        </div>
        <div className="p-[5px] m-[5px] ">
          <p className="mt-4 text-center">
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")}>
              Register
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;