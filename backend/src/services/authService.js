const db = require("../config/firebase");
// config/firebase default app initialize karta hai — getAuth() usi ko leta hai
const { getAuth } = require("firebase-admin/auth");

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

/*
| Owner token exchange. Owner ka password Firebase Auth ke paas hai, yahan
| kabhi check nahi hota — frontend ka Firebase login hi saboot hai, aur uska
| ID token yahan verify hota hai.
|
| Frontend login jo check karta hai (AuthContext: company active,
| ownerUid === uid) wahi yahan dobara — client ki baat maan kar owner role
| nahi diya jaata.
*/
const verifyOwner = async (idToken, companyCode) => {
  let decoded;

  try {
    // checkRevoked: disable/delete hua Firebase user purane ID token se na aaye
    decoded = await getAuth().verifyIdToken(idToken, true);
  } catch (error) {
    console.error("Owner ID token verification failed:", error.code || error);

    return {
      success: false,
      status: 401,
      message: "Invalid or expired owner session.",
    };
  }

  const snapshot = await db
    .ref(`companies/${companyCode}/details`)
    .once("value");

  if (!snapshot.exists()) {
    return { success: false, status: 404, message: "Company not found." };
  }

  const company = snapshot.val();

  if (company.ownerUid !== decoded.uid) {
    return { success: false, status: 403, message: "Invalid Company Code." };
  }

  if (company.status !== "active") {
    return {
      success: false,
      status: 403,
      message: "Company account is inactive.",
    };
  }

  return {
    success: true,
    uid: decoded.uid,
    companyCode,
  };
};

module.exports = {
  loginEmployee,
  getEmployeeProfile,
  verifyOwner,
};