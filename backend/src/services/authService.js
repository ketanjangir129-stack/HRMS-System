const db = require("../config/firebase");
// config/firebase default app initialize karta hai — getAuth() usi ko leta hai
const { getAuth } = require("firebase-admin/auth");
const {
  loadDepartments,
  withDepartmentNames,
} = require("../utils/departmentRefs");

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
    user: toSafeUser(
      withDepartmentNames(employee, await loadDepartments(companyCode)),
      normalizedEmployeeId,
      companyCode
    ),
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
    user: toSafeUser(
      withDepartmentNames(employee, await loadDepartments(companyCode)),
      normalizedEmployeeId,
      companyCode
    ),
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

/*
| Company registration. Owner ka Firebase Auth account aur company ka
| `details` node dono yahin bante hain — pehle ye browser me teen alag steps
| the (code check, Auth signup, DB write), aur beech me fail hone par ya do log
| ek hi code ek saath lene par aadha-adhoora data reh jaata tha.
|
| Code ka claim transaction se hota hai: `details` sirf tab likha jaata hai
| jab wo khaali ho, isliye do requests me se ek hi jeetegi. Haarne wale ka
| Auth user turant delete hota hai, taaki wo email dobara use ho sake.
*/
const registerCompany = async ({
  companyCode,
  companyName,
  ownerName,
  email,
  password,
  mobile,
  address,
}) => {
  const detailsRef = db.ref(`companies/${companyCode}/details`);

  // Jaldi mana kar do — warna Auth user bana kar turant delete karna padta
  const existing = await detailsRef.child("companyCode").once("value");

  if (existing.exists()) {
    return {
      success: false,
      status: 409,
      field: "companyCode",
      message: "Company Code already exists.",
    };
  }

  let ownerUser;

  try {
    ownerUser = await getAuth().createUser({
      email,
      password,
      displayName: ownerName,
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        status: 409,
        field: "email",
        message: "An account with this email already exists.",
      };
    }

    if (
      error.code === "auth/invalid-email" ||
      error.code === "auth/invalid-password"
    ) {
      return {
        success: false,
        status: 400,
        field: error.code === "auth/invalid-email" ? "email" : "password",
        message: error.message,
      };
    }

    throw error;
  }

  const details = {
    ownerUid: ownerUser.uid,
    companyCode,
    companyName,
    ownerName,
    email,
    mobile,
    address,
    status: "active",
    createdAt: Date.now(),
  };

  let claimed = false;

  try {
    const { committed } = await detailsRef.transaction((current) =>
      current === null ? details : undefined
    );

    claimed = committed;
  } finally {
    if (!claimed) {
      await getAuth()
        .deleteUser(ownerUser.uid)
        .catch((error) =>
          console.error("Failed to roll back owner account:", error)
        );
    }
  }

  if (!claimed) {
    return {
      success: false,
      status: 409,
      field: "companyCode",
      message: "Company Code already exists.",
    };
  }

  return {
    success: true,
    company: details,
  };
};

module.exports = {
  loginEmployee,
  getEmployeeProfile,
  verifyOwner,
  registerCompany,
};