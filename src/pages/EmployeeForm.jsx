import { useState, useEffect } from "react";
import { createEmployee } from "../services/EmployeeService";
import { getDepartments } from "../services/departmentService"
import { validateField } from "../utils/validation/validateField";
import { validateForm } from "../utils/validation/validateForm";
import { useNavigate } from "react-router-dom";

function EmployeeForm() {

  const companyCode = localStorage.getItem("companyCode");
  const [employee, setEmployee] = useState({
    personalInfo: {
      name: "",
      email: "",
      mobile: "",
      address: "",
      gender: "",
      
    },

    employmentInfo: {
      employeeId: "",
      department: "",
      designation: "",
      joiningDate: "",
      employeeType: "",
    },

    bankInfo: {
      bankName: "",
      accountNumber: "",
      ifsc: "",
      branch: "",
    },

    salaryInfo: {
      basicSalary: "",
      hra: "",
      bonus: "",
    },

    documents: {
      aadhaar: "",
      pan: "",
      resume: "",
    },
    account: {
      username: "",
      password: "",
      role: "employee",
      status: "Active",
      isPasswordChanged: false,
    },
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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

    if (["name", "email", "mobile", "address", "gender"].includes(name)) {
      setEmployee({
        ...employee,
        personalInfo: {
          ...employee.personalInfo,
          [name]: value,
        },
      });
    }

    else if (
      ["employeeId", "department", "designation", "joiningDate", "employeeType"].includes(name)
    ) {
      setEmployee({
        ...employee,
        employmentInfo: {
          ...employee.employmentInfo,
          [name]: value,
        },
      });
    }else if (name === "role") {
      setEmployee({
          ...employee,
          account: {
              ...employee.account,
              role: value,
          },
      });
    }
  };

  const handleDepartmentChange = (e) => {
    const selectedDepartment = e.target.value;

    setEmployee({
      ...employee,
      employmentInfo: {
        ...employee.employmentInfo,
        department: selectedDepartment,
        designation: "",
      },
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

    
    const validationErrors = validateForm({
      personalInfo: employee.personalInfo,
      employmentInfo: employee.employmentInfo,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);

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
      navigate("/employees");

    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to add employee");
    } finally {
      setSaving(false);
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
              value={employee.employmentInfo.employeeId}
              onChange={handleChange}
              placeholder="Enter Employee ID"
              className="w-full border rounded-lg p-3"
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
              value={employee.personalInfo.name}
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
              value={employee.personalInfo.email}
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
              value={employee.personalInfo.mobile}
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

          {/* Gender */}
          <div>
            <label className="block mb-2 font-medium">
              Gender
            </label>

            <select
              name="gender"
              value={employee.personalInfo.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>

            {errors.gender && (
              <p className="mt-1 text-sm text-red-500">
                {errors.gender}
              </p>
            )}
          </div>

          {/* joining date */}
          <div>
            <label className="block mb-2 font-medium">
              Joining Date
            </label>

            <input
              type="date"
              name="joiningDate"
              value={employee.employmentInfo.joiningDate}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
              onBlur={handleBlur}
            />

            {errors.joiningDate && (
              <p className="mt-1 text-sm text-red-500">
                {errors.joiningDate}
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
              value={employee.employmentInfo.department}
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
              value={employee.employmentInfo.designation}
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

          {/* employeeType */}
          <div>
            <label className="block mb-2 font-medium">
              Employee Type
            </label>

            <input
              type="text"
              name="employeeType"
              value={employee.employmentInfo.employeeType}
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

          {/* Role */}
          <div>
            <label className="block mb-2 font-medium">
              Role
            </label>

            <select
              name="role"
              value={employee.account.role}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
            >
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
            </select>
          </div>

        </div>

        {/* Address */}
        <div className="mt-6">

          <label className="block mb-2 font-medium">
            Address
          </label>

          <textarea
            name="address"
            value={employee.personalInfo.address}
            onChange={handleChange}
            onBlur={handleBlur}
            rows="4"
            placeholder="Enter Address"
            className="w-full border rounded-lg p-3 resize-none"
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
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default EmployeeForm;