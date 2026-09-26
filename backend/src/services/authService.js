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

// Record jaisa ka waisa, bas password ke bina. Frontend har jagah
// personalInfo / employmentInfo / account hi padhta hai (naam, employee id,
// department, notifications, tasks, payroll), isliye shape wahi rakhi hai.
const toSafeUser = (employee, employeeId, companyCode) => {
  // Password itself is never returned
  const { password, ...account } = employee.account || {};

  return {
    ...employee,
    employmentInfo: {
      ...employee.employmentInfo,
      employeeId: employee.employmentInfo?.employeeId || employeeId,
    },
    account,
    companyCode,
    role: account.role,
    isPasswordChanged: account.isPasswordChanged ?? false,
  };
};

module.exports = {
  loginEmployee,
  getEmployeeProfile,
};