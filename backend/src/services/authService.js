const db = require("../config/firebase");

const loginEmployee = async (
  companyCode,
  employeeId,
  password
) => {
  const normalizedEmployeeId = employeeId.toUpperCase();

  const snapshot = await db
    .ref(
      `companies/${companyCode}/employees/${normalizedEmployeeId}`
    )
    .once("value");

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Employee not found.",
    };
  }

  const employee = snapshot.val();

  if (!employee.account) {
    return {
      success: false,
      message: "Invalid Credentials.",
    };
  }

  if (employee.account.status !== "Active") {
    return {
      success: false,
      message: "Account is inactive.",
    };
  }

  if (employee.account.password !== password) {
    return {
      success: false,
      message: "Invalid Credentials.",
    };
  }

  return {
    success: true,
    user: toSafeUser(employee, normalizedEmployeeId, companyCode),
    role: employee.account.role,
  };
};

// Session restore: token is already verified, so load the latest profile
// from the DB instead of trusting whatever the client has cached.
const getEmployeeProfile = async (companyCode, employeeId) => {
  const normalizedEmployeeId = String(employeeId).toUpperCase();

  const snapshot = await db
    .ref(
      `companies/${companyCode}/employees/${normalizedEmployeeId}`
    )
    .once("value");

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Employee not found.",
    };
  }

  const employee = snapshot.val();

  if (!employee.account || employee.account.status !== "Active") {
    return {
      success: false,
      message: "Account is inactive.",
    };
  }

  return {
    success: true,
    user: toSafeUser(employee, normalizedEmployeeId, companyCode),
  };
};

const toSafeUser = (employee, employeeId, companyCode) => ({
  employeeId: employee.employeeId || employeeId,
  fullName: employee.fullName,
  email: employee.email,
  phone: employee.phone,
  department: employee.department,
  designation: employee.designation,
  companyCode,
  role: employee.account.role,
  // Password itself is never returned
  isPasswordChanged:
    employee.account.isPasswordChanged ?? false,
});

module.exports = {
  loginEmployee,
  getEmployeeProfile,
};