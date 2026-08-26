import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBriefcase,
  FiInfo,
  FiLoader,
  FiSend,
  FiUser,
  FiUserPlus,
} from "react-icons/fi";
import { createOnboardingRequest } from "../../services/OnboardingService";
import { getDepartments } from "../../services/departmentService"
import { validateField } from "../../utils/validation/validateField"
import { validateForm } from "../../utils/validation/validateForm";

function OnBoardForm() {

  const navigate = useNavigate();

  const initialState = {
    employeeId: "",
    name: "",
    email: "",
    mobile: "",
    department: "",
    designation: "",
    joiningDate: "",
    employeeType: "",

    role: "employee",
  };

  const companyCode = localStorage.getItem("companyCode");
  const [employee, setEmployee] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);


  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const data = await getDepartments(companyCode);

    const departmentArray = Object.keys(data || {}).map((key) => ({
      id: key,
      ...data[key],
    }));

    setDepartments(departmentArray);
  };


  const handleChange = (e) => {
    const { name, value } = e.target;

    setEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };
  const handleDepartmentChange = (e) => {
    const department = e.target.value;

    setEmployee((prev) => ({
      ...prev,
      department,
      designation: "",
    }));

    setErrors((prev) => ({
      ...prev,
      department: "",
      designation: "",
    }));

    const selected = departments.find(
      (item) => item.name === department
    );

    if (!selected) {
      setDesignations([]);
      return;
    }

    const designationArray = selected.designations
      ? Object.keys(selected.designations).map((key) => ({
        id: key,
        ...selected.designations[key],
      }))
      : [];

    setDesignations(designationArray);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, employee),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(employee);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {

      const result = await createOnboardingRequest(
        companyCode,
        employee
      );
      console.log("Invitation Link:", result.invitationLink);

      if (!result.success) {

        setErrors((prev) => ({
          ...prev,
          [result.field]: result.message,
        }));

        return;
      }
      toast.success(result.message);
      setEmployee(initialState);
      setErrors({});
      setDesignations([]);
      navigate("/OnboardDashboard");

    } catch (error) {

      console.error(error);

      toast.error("Failed to create onboarding request.");

    } finally {

      setLoading(false);

    }
  };

  const fieldClass = (name) =>
    `w-full rounded-xl border p-3 bg-surface text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 ${errors[name]
      ? "border-red-300 focus:border-red-400 focus:ring-red-200"
      : "border-slate-200 focus:border-blue-400 focus:ring-blue-200"
    }`;

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

  const errorClass = "mt-1.5 flex items-center gap-1 text-xs text-red-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">

      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">

        {/* Back button, icon and title share one row at every width. Below `sm`
            the two squares and the heading step down a size so all three fit
            without the title wrapping mid-phrase. */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">

          <button
            type="button"
            onClick={() => navigate("/OnboardDashboard")}
            title="Go back"
            aria-label="Go back"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:h-11 sm:w-11"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
            <FiUserPlus className="text-lg text-white sm:text-xl" />
          </div>

          <div className="min-w-0">

            <h1 className="text-xl font-bold tracking-tight text-slate-900 max-sm:leading-tight sm:text-3xl">
              Onboard Employee
            </h1>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block sm:text-base">
              Create an onboarding invitation for a new employee.
            </p>

          </div>

        </div>

      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >

        {/* Basic details */}
        <div className="px-5 py-6 sm:px-6">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiUser />
            </div>

            <div>

              <h2 className="text-base font-semibold text-slate-900">
                Basic Details
              </h2>

              <p className="text-xs text-slate-500">
                Identity and contact information of the employee.
              </p>

            </div>

          </div>

          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">

            {/* Employee ID */}
            <div>
              <label className={labelClass}>
                Employee ID
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="text"
                name="employeeId"
                value={employee.employeeId}
                // disabled
                onChange={handleChange}
                required
                placeholder="Enter Employee ID"
                className={fieldClass("employeeId")}
                onBlur={handleBlur}
              />

              {errors.employeeId && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.employeeId}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>
                Employee Name
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="text"
                name="name"
                value={employee.name}
                onChange={handleChange}
                placeholder="Enter Employee Name"
                className={fieldClass("name")}
                onBlur={handleBlur}
              />

              {errors.name && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>
                Email
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="email"
                name="email"
                required
                value={employee.email}
                onChange={handleChange}
                placeholder="Enter Email"
                className={fieldClass("email")}
                onBlur={handleBlur}
              />

              {errors.email && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className={labelClass}>
                Mobile Number
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="text"
                name="mobile"
                maxLength={10}
                value={employee.mobile}
                onChange={handleChange}
                placeholder="Enter Mobile Number"
                className={fieldClass("mobile")}
                onBlur={handleBlur}
              />

              {errors.mobile && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.mobile}
                </p>
              )}
            </div>

          </div>

        </div>

        <div className="border-t border-slate-100" />

        {/* Employment details */}
        <div className="px-5 py-6 sm:px-6">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiBriefcase />
            </div>

            <div>

              <h2 className="text-base font-semibold text-slate-900">
                Employment Details
              </h2>

              <p className="text-xs text-slate-500">
                Role, department and joining information.
              </p>

            </div>

          </div>

          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">

            {/* Department */}
            <div>
              <label className={labelClass}>
                Department
                <span className="text-red-500"> *</span>
              </label>

              <select
                name="department"
                value={employee.department}
                onChange={handleDepartmentChange}
                onBlur={handleBlur}
                className={`${fieldClass("department")} cursor-pointer`}
              >
                <option value="">Select Department</option>

                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>

              {errors.department && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.department}
                </p>
              )}
            </div>

            {/* Designation */}
            <div>
              <label className={labelClass}>
                Designation
                <span className="text-red-500"> *</span>
              </label>

              <select
                name="designation"
                value={employee.designation}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${fieldClass("designation")} cursor-pointer`}
              >
                <option value="">Select Designation</option>

                {designations.map((des) => (
                  <option key={des.id} value={des.name}>
                    {des.name}
                  </option>
                ))}
              </select>

              {errors.designation && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.designation}
                </p>
              )}
            </div>

            {/* joining date */}
            <div>
              <label className={labelClass}>
                Joining Date
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="date"
                name="joiningDate"
                maxLength={10}
                value={employee.joiningDate}
                onChange={handleChange}
                placeholder="Employee joiningDate"
                className={`${fieldClass("joiningDate")} cursor-pointer`}
                onBlur={handleBlur}
              />

              {errors.joiningDate && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.joiningDate}
                </p>
              )}
            </div>

            {/* employeeType */}
            <div>
              <label className={labelClass}>
                Employee Type
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="text"
                name="employeeType"
                value={employee.employeeType}
                onChange={handleChange}
                placeholder="Enter Employee Type (e.g., Full Time)"
                className={fieldClass("employeeType")}
                onBlur={handleBlur}
              />

              {errors.employeeType && (
                <p className={errorClass}>
                  <FiAlertCircle className="shrink-0" />
                  {errors.employeeType}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className={labelClass}>
                Role
              </label>

              <select
                name="role"
                value={employee.role}
                onChange={handleChange}
                className={`${fieldClass("role")} cursor-pointer`}
              >
                <option value="employee">
                  Employee
                </option>

                <option value="hr">
                  HR
                </option>
              </select>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FiInfo className="shrink-0 text-slate-400" />
            An invitation link will be generated for the employee to complete onboarding.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <FiSend />
                Send Invitation
              </>
            )}
          </button>

        </div>

      </form>

    </div>
  );
}

export default OnBoardForm;