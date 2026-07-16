import { db } from "../firebase/firebase";
import { ref, push } from "firebase/database"
import { useState } from "react";
function EmployeeForm() {

  const [employee, setEmployee] = useState({
    employeeId: "",
    name: "",
    email: "",
    department: "",
    designation: "",
    mobile: "",
    address: "",
  });




  const handleChange = (e) => {
    const { name, value } = e.target;

    setEmployee({
      ...employee,
      [name]: value,
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
try{
    const employeeRef = ref(db, "employees");
    await push(empolyeeRef, employee);
    alert("Employee added successfully");
     setEmployee({
      employeeId: "",
      name: "",
      email: "",
      department: "",
      designation: "",
      mobile: "",
      address: "",
    });
}catch(error){
  console.log(error);
  alert("failed to add employee");
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
              className="w-full border rounded-lg p-3 bg-gray-100"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 font-medium">
              Employee Name
            </label>

            <input
              type="text"
              name="name"
              pattern="[A-Za-z ]+"
              required
              value={employee.name}
              onChange={handleChange}
              placeholder="Enter Employee Name"
              className="w-full border rounded-lg p-3"
            />
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
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block mb-2 font-medium">
              Mobile Number
            </label>

            <input
              type="text"
              name="mobile"
              pattern="[0-9]{10}"
              max-length ={10}
              required
              value={employee.mobile}
              onChange={handleChange}
              placeholder="Enter Mobile Number"
              className="w-full border rounded-lg p-3"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block mb-2 font-medium">
              Department
            </label>

            <select
              name="department"
              value={employee.department}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Department</option>
              <option>HR</option>
              <option>IT</option>
              <option>Finance</option>
              <option>Sales</option>
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="block mb-2 font-medium">
              Designation
            </label>

            <input
              type="text"
              name="designation"
              value={employee.designation}
              onChange={handleChange}
              required
              placeholder="Enter Designation"
              className="w-full border rounded-lg p-3"
            />
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
            rows="4"
            placeholder="Enter Address"
            className="w-full border rounded-lg p-3"
          ></textarea>

        </div>

        <div className="flex justify-end gap-4 mt-8">

          {/* <button
            type="reset"
            className="px-6 py-3 border rounded-lg"
          >
            Cancel
          </button> */}

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