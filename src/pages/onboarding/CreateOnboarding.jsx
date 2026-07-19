import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { createOnboardingRequest } from "../../services/OnboardingService";
import { getDepartments } from "../../services/departmentService"
import { validateField } from "../../utils/validation/validateField"
import { validateForm } from "../../utils/validation/validateForm";

function OnBoardForm() {

  const initialState = {
  employeeId: "",
  name: "",
  email: "",
  mobile: "",
  department: "",
  designation: "",
  joiningDate: "",
  employeeType: "",
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
    console.log("Invitation Link:",result.invitationLink);

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

  } catch (error) {

    console.error(error);

    toast.error("Failed to create onboarding request.");

  } finally {

    setLoading(false);

  }
};

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-8">

      <h2 className="text-3xl font-bold mb-8">
        Add Employee
      </h2>

      <form onSubmit={handleSubmit}>

        <div className="grid grid-cols-2 gap-6">

          {/* Employee ID */}
          <div>
            <label className="block mb-2 font-medium">
              Employee ID
            </label>

            <input
              type="text"
              name="employeeId"
              value={employee.employeeId}
              // disabled
              onChange={handleChange}
              required
              placeholder="Enter Employee ID"
              className="w-full border rounded-lg p-3 "
              onBlur={handleBlur}
            />

            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-500">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 font-medium">
              Employee Name
            </label>

            <input
              type="text"
              name="name"
              value={employee.name}
              onChange={handleChange}
              placeholder="Enter Employee Name"
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 font-medium">
              Email
            </label>

            <input
              type="email"
              name="email"
              required
              value={employee.email}
              onChange={handleChange}
              placeholder="Enter Email"
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Mobile */}
          <div>
            <label className="block mb-2 font-medium">
              Mobile Number
            </label>

            <input
              type="text"
              name="mobile"
              maxLength={10}
              value={employee.mobile}
              onChange={handleChange}
              placeholder="Enter Mobile Number"
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.mobile && (
              <p className="mt-1 text-sm text-red-500">
                {errors.mobile}
              </p>
            )}
          </div>
           {/* joining date */}
 <div>
            <label className="block mb-2 font-medium">
              joining Date
            </label>

            <input
              type="date"
              name="joiningDate"
              maxLength={10}
              value={employee.joiningDate}
              onChange={handleChange}
              placeholder="Employee joiningDate"
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.joiningDate && (
              <p className="mt-1 text-sm text-red-500">
                {errors.joiningDate}
              </p>
            )}
          </div>
          {/* employeeType */}
          <div>
            <label className="block mb-2 font-medium">
              Employee Type
            </label>

            <input
              type="text"
              name="employeeType"
              value={employee.employeeType}
              onChange={handleChange}
              placeholder="Enter Employee Type (e.g., Full Time)"
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.employeeType && (
              <p className="mt-1 text-sm text-red-500">
                {errors.employeeType}
              </p>
            )}
          </div>
          {/* Department */}
          <div>
            <label className="block mb-2 font-medium">
              Department
            </label>

            <select
              name="department"
              value={employee.department}
              onChange={handleDepartmentChange}
              onBlur={handleBlur}
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Department</option>

              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            {errors.department && (
              <p className="mt-1 text-sm text-red-500">
                {errors.department}
              </p>
            )}
          </div>

          {/* Designation */}
          <div>
            <label className="block mb-2 font-medium">
              Designation
            </label>
            <select
              name="designation"
              value={employee.designation}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Designation</option>

              {designations.map((des) => (
                <option key={des.id} value={des.name}>
                  {des.name}
                </option>
              ))}
            </select>
            
          </div>

        </div>


        <div className="flex justify-end gap-4 mt-8">

          <button
  type="submit"
  disabled={loading}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
>
  {loading
    ? "Sending Invitation..."
    : "Send Invitation"}
</button>

        </div>

      </form>

    </div>
  );
}

export default OnBoardForm;