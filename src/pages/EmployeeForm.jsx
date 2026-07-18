import { useState, useEffect } from "react";
import { createEmployee } from "../services/EmployeeService";
import { getDepartments } from "../services/departmentService"
import { validateField } from "../utils/validation/validateField";
import { validateForm } from "../utils/validation/validateForm";
function EmployeeForm() {

  const companyCode = localStorage.getItem("companyCode");
  const [employee, setEmployee] = useState({
  personalInfo: {
    name: "",
    email: "",
    mobile: "",
    address: "",
    gender: "",
    dob: "",
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
    status: "Active",
  },
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

  if (["name", "email", "mobile", "address", "gender", "dob"].includes(name)) {
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

  // Validate only the sections shown on this form
  const validationErrors = validateForm({
    personalInfo: employee.personalInfo,
    employmentInfo: employee.employmentInfo,
  });

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
  personalInfo: {
    name: "",
    email: "",
    mobile: "",
    address: "",
    gender: "",
    dob: "",
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
    status: "Active",
  },
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
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-md">

      {/* Gradient header */}
      <div className="bg-gradient-to-r from-pink-600 via-indigo-600 to-teal-500 px-8 py-7 text-white">
        <h2 className="text-3xl font-bold">Add Employee</h2>
        <p className="mt-1 text-sm text-white/80">
          Fill in the details below to create a new employee record.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8">

        <div className="grid grid-cols-2 gap-6">

          {/* Employee ID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Employee ID
            </label>

            <input
              type="text"
              name="employeeId"
              value={employee.employmentInfo.employeeId}
              // disabled
              onChange={handleChange}
              required
              placeholder="Enter Employee ID"
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 "
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Employee Name
            </label>

            <input
              type="text"
              name="name"
              value={employee.personalInfo.name}
              onChange={handleChange}
              placeholder="Enter Employee Name"
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              required
              value={employee.personalInfo.email}
              onChange={handleChange}
              placeholder="Enter Email"
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mobile Number
            </label>

            <input
              type="text"
              name="mobile"
              maxLength={10}
              value={employee.personalInfo.mobile}
              onChange={handleChange}
              placeholder="Enter Mobile Number"
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Department
            </label>

            <select
              name="department"
              value={employee.employmentInfo.department}
              onChange={handleDepartmentChange}
              onBlur={handleBlur}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Designation
            </label>
            <select
              name="designation"
              value={employee.employmentInfo.designation}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Address
          </label>

          <textarea
            name="address"
            value={employee.personalInfo.address}
            onChange={handleChange}
            onBlur={handleBlur}
            rows="4"
            placeholder="Enter Address"
            className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"

          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-500">
              {errors.address}
            </p>
          )}

        </div>

        <div className="mt-8 flex justify-end gap-4  pt-6">

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-8 py-3 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Save
          </button>

        </div>

      </form>

    </div>
  );
}

export default EmployeeForm;