import { useState, useEffect } from "react";
import { createEmployee } from "../services/EmployeeService";
import { getDepartments } from "../services/departmentService"
import { validateField } from "../utils/validation/validateField";
import { validateForm } from "../utils/validation/validateForm";
function EmployeeForm() {

  const companyCode = localStorage.getItem("companyCode");
  const [employee, setEmployee] = useState({
    employeeId: "",
    name: "",
    email: "",
    department: "",
    designation: "",
    mobile: "",
    address: "",
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const data = await getDepartments(companyCode);

    if (!data) {
      setDepartments([]);
      return;
    }

    const departmentArray = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    setDepartments(departmentArray);
  };


  const handleChange = (e) => {
    const { name, value } = e.target;

    setEmployee({
      ...employee,
      [name]: value,
    });
  };

  const handleDepartmentChange = (e) => {
    const selectedDepartment = e.target.value;

    setEmployee({
      ...employee,
      department: selectedDepartment,
      designation: "",
    });

    const dept = departments.find(
      (item) => item.name === selectedDepartment
    );

    if (dept) {
      const designationArray = dept.designations
        ? Object.keys(dept.designations).map((key) => ({
          id: key,
          ...dept.designations[key],
        }))
        : [];

      setDesignations(designationArray);
    } else {
      setDesignations([]);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, employee),
    }));
  };
  const [errors, setErrors] = useState({});

const handleSubmit = async (e) => {
  e.preventDefault();

  // Clear previous errors
  setErrors({});

  // Validate form fields
  const validationErrors = validateForm(employee);

  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  try {
    const result = await createEmployee(
      companyCode,
      employee
    );

    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [result.field]: result.message,
      }));
      return;
    }

    alert("Employee added successfully");

    // Reset form
    setEmployee({
      employeeId: "",
      name: "",
      email: "",
      department: "",
      designation: "",
      mobile: "",
      address: "",
    });

    // Reset designation dropdown
    setDesignations([]);

    // Clear validation errors
    setErrors({});

  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to add employee");
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
              onBlur={handleBlur}
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Designation</option>

              {designations.map((des) => (
                <option key={des.id} value={des.name}>
                  {des.name}
                </option>
              ))}
            </select>

            {errors.designation && (
              <p className="mt-1 text-sm text-red-500">
                {errors.designation}
              </p>
            )}

          </div>

        </div>

        {/* Address */}
        <div className="mt-6">

          <label className="block mb-2 font-medium">
            Address
          </label>

          <textarea
            name="address"
            value={employee.address}
            onChange={handleChange}
            onBlur={handleBlur}
            rows="4"
            placeholder="Enter Address"
            className="w-full border rounded-lg p-3"

          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-500">
              {errors.address}
            </p>
          )}

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>

        </div>

      </form>

    </div>
  );
}

export default EmployeeForm;