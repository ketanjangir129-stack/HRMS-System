import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  // Guards: only a logged-in HR/Employee whose password is still the default
  // may reach this page. Owner and already-updated users are sent to dashboard.
  const companyCode = localStorage.getItem("companyCode");
  const role = localStorage.getItem("role");
  const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  if (!companyCode) {
    return <Navigate to="/login" replace />;
  }
  if (role === "owner" || storedUser?.account?.isPasswordChanged !== false) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateChangeField = (name, value) => {
    if (name === "currentPassword") {
      return String(value ?? "").trim() ? "" : "This field is required.";
    }

    if (name === "newPassword") {
      if (!String(value ?? "").trim()) {
        return "This field is required.";
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
        return "Password must be at least 8 characters and contain uppercase, lowercase and number.";
      }
      if (value === formData.currentPassword) {
        return "New password cannot be the same as current password.";
      }
      return "";
    }

    if (name === "confirmPassword") {
      if (!String(value ?? "").trim()) {
        return "This field is required.";
      }
      if (value !== formData.newPassword) {
        return "Passwords do not match.";
      }
      return "";
    }

    return "";
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validateChangeField(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    Object.entries(formData).forEach(([name, value]) => {
      const error = validateChangeField(name, value);
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
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Password updated successfully");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        {/* header */}
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Change Password
          </h1>

          <p className="text-center text-gray-500 mb-8">
            Update your password to continue
          </p>
        </div>
        <div>
          {/* body */}
          <form onSubmit={handleSubmit}>

            {/* Current Password */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                Current Password
              </label>

              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="********"
                className="w-full border rounded-lg p-3"
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                New Password
              </label>

              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="********"
                className="w-full border rounded-lg p-3"
              />

              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="********"
                className="w-full border rounded-lg p-3"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
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

                  <span>Updating...</span>

                </div>
              ) : (
                "Update Password"
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
