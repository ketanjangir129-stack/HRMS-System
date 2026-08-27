import { useState, useEffect } from "react";
import { createEmployee } from "../services/EmployeeService";
import { getDepartments } from "../services/departmentService"
import { validateField } from "../utils/validation/validateField";
import { validateForm } from "../utils/validation/validateForm";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiBriefcase,
  FiShield,
  FiUser,
  FiUserPlus,
} from "react-icons/fi";

/*
| The form is split into the same cards the details page shows after the
| employee is created — personal, employment and account — so adding someone
| and opening them later read as the same screen.
*/
function FormSection({ icon: Icon, accent, title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 sm:gap-3.5 sm:px-6">

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg sm:h-10 sm:w-10 ${accent}`}
        >
          <Icon />
        </span>

        <div className="min-w-0">

          <h2 className="truncate text-base font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
        {children}
      </div>

    </section>
  );
}

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

/*
| `text-base` below `sm` stops iOS Safari zooming in when a field takes
| focus, which any font under 16px triggers.
*/
const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 sm:text-sm ${
    hasError
      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

function FieldError({ message }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs font-medium text-red-500">
      {message}
    </p>
  );
}

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

    // salaryInfo yahan nahi — salary Salary module se assign hoti hai
    // (companies/{code}/salaries/{employeeId})

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

  const loadDepartments = async () => {
    try {
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
    } catch (error) {
      // Form khulа rahe — sirf department dropdown khaali hoga
      console.error("Failed to load departments:", error);
      setDepartments([]);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);


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

      toast.success("Employee added successfully.");
      navigate("/employees");

    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to add employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-0 sm:space-y-5 sm:p-2">

      {/* Toolbar */}
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5">

        <button
          type="button"
          onClick={() => navigate("/employees")}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
        >
          <FiArrowLeft className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to Employees</span>
        </button>

      </div>

      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-6">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
          <FiUserPlus />
        </div>

        <div className="min-w-0">

          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Add Employee
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
            Create the employment record and portal access for a new joiner.
          </p>

        </div>

      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

        <FormSection
          icon={FiUser}
          accent="bg-blue-50 text-blue-600"
          title="Personal Information"
          subtitle="Identity, contact and address details."
        >

          {/* Name */}
          <div>
            <label className={labelClass}>
              Employee Name
            </label>

            <input
              type="text"
              name="name"
              value={employee.personalInfo.name}
              onChange={handleChange}
              placeholder="Enter Employee Name"
              className={fieldClass(errors.name)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.name} />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>
              Email
            </label>

            <input
              type="email"
              name="email"
              value={employee.personalInfo.email}
              onChange={handleChange}
              placeholder="Enter Email"
              className={fieldClass(errors.email)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.email} />
          </div>

          {/* Mobile */}
          <div>
            <label className={labelClass}>
              Mobile Number
            </label>

            <input
              type="text"
              name="mobile"
              maxLength={10}
              value={employee.personalInfo.mobile}
              onChange={handleChange}
              placeholder="Enter Mobile Number"
              className={fieldClass(errors.mobile)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.mobile} />
          </div>

          {/* Gender */}
          <div>
            <label className={labelClass}>
              Gender
            </label>

            <select
              name="gender"
              value={employee.personalInfo.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`cursor-pointer ${fieldClass(errors.gender)}`}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <FieldError message={errors.gender} />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">

            <label className={labelClass}>
              Address
            </label>

            <textarea
              name="address"
              value={employee.personalInfo.address}
              onChange={handleChange}
              onBlur={handleBlur}
              rows="4"
              placeholder="Enter Address"
              className={`resize-none ${fieldClass(errors.address)}`}
            />

            <FieldError message={errors.address} />

          </div>

        </FormSection>

        <FormSection
          icon={FiBriefcase}
          accent="bg-violet-50 text-violet-600"
          title="Employment Information"
          subtitle="Role, department and joining details."
        >

          {/* Employee ID */}
          <div>
            <label className={labelClass}>
              Employee ID
            </label>

            <input
              type="text"
              name="employeeId"
              value={employee.employmentInfo.employeeId}
              onChange={handleChange}
              placeholder="Enter Employee ID"
              className={fieldClass(errors.employeeId)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.employeeId} />
          </div>

          {/* joining date */}
          <div>
            <label className={labelClass}>
              Joining Date
            </label>

            <input
              type="date"
              name="joiningDate"
              value={employee.employmentInfo.joiningDate}
              onChange={handleChange}
              className={fieldClass(errors.joiningDate)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.joiningDate} />
          </div>

          {/* Department */}
          <div>
            <label className={labelClass}>
              Department
            </label>

            <select
              name="department"
              value={employee.employmentInfo.department}
              onChange={handleDepartmentChange}
              onBlur={handleBlur}
              className={`cursor-pointer ${fieldClass(errors.department)}`}
            >
              <option value="">Select Department</option>

              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.department} />
          </div>

          {/* Designation */}
          <div>
            <label className={labelClass}>
              Designation
            </label>

            <select
              name="designation"
              value={employee.employmentInfo.designation}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={!employee.employmentInfo.department}
              className={`cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${fieldClass(
                errors.designation
              )}`}
            >
              <option value="">
                {employee.employmentInfo.department
                  ? "Select Designation"
                  : "Select Department first"}
              </option>

              {designations.map((des) => (
                <option key={des.id} value={des.name}>
                  {des.name}
                </option>
              ))}
            </select>

            <FieldError message={errors.designation} />
          </div>

          {/* employeeType */}
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Employee Type
            </label>

            <input
              type="text"
              name="employeeType"
              value={employee.employmentInfo.employeeType}
              onChange={handleChange}
              placeholder="Enter Employee Type (e.g., Full Time)"
              className={fieldClass(errors.employeeType)}
              onBlur={handleBlur}
            />

            <FieldError message={errors.employeeType} />
          </div>

        </FormSection>

        <FormSection
          icon={FiShield}
          accent="bg-amber-50 text-amber-600"
          title="Account Access"
          subtitle="What this employee can reach inside the portal."
        >

          {/* Role */}
          <div>
            <label className={labelClass}>
              Role
            </label>

            <select
              name="role"
              value={employee.account.role}
              onChange={handleChange}
              className={`cursor-pointer ${fieldClass(false)}`}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
            </select>

            {/*
              A manager approves nothing until a department is handed to them
              on the Departments screen, so the role on its own is not the
              whole setup and the form says so rather than leaving somebody
              wondering why the approval queue is empty.
            */}
            {employee.account.role === "manager" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Assign this manager to a department from the Departments page
                to give them attendance and leave approvals for it.
              </p>
            )}
          </div>

          {/* Login is not asked for here — EmployeeService sets both the
              username and the first password to the Employee ID. */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">

            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400">
              <FiShield />
            </span>

            <p className="text-xs leading-relaxed text-slate-500">
              The portal username and the first-time password are both set to
              the Employee ID entered above.
            </p>

          </div>

        </FormSection>

        <div className="flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">

          <button
            type="button"
            onClick={() => navigate("/employees")}
            disabled={saving}
            className="w-full cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto"
          >
            <FiUserPlus />
            {saving ? "Saving..." : "Save Employee"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default EmployeeForm;
