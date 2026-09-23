const db = require("../config/firebase");

const normalize = (value) => String(value ?? "").trim().toLowerCase();

// Form ke saare fields string hain — koi object/array aaye to bhi string hi save ho
const pick = (source, keys) =>
  Object.fromEntries(keys.map((key) => [key, String(source?.[key] ?? "")]));

/*
| Frontend ke checkEmployeeUniqueness (src/services/ValidationService.js)
| jaisa hi: active employees + pending onboardingRequests dono dekhta hai,
| aur email/mobile personalInfo + employmentInfo dono me dhoondhta hai.
*/
const findIdentityConflict = async (companyCode, employee) => {
  const [employeeSnapshot, onboardingSnapshot] = await Promise.all([
    db.ref(`companies/${companyCode}/employees`).once("value"),
    db.ref(`companies/${companyCode}/onboardingRequests`).once("value"),
  ]);

  const records = [
    ...Object.values(employeeSnapshot.val() || {}),
    ...Object.values(onboardingSnapshot.val() || {}),
  ];

  const employeeIds = new Set();
  const emails = new Set();
  const mobiles = new Set();

  records.forEach((record) => {
    const employment = record.employmentInfo || {};
    const personal = record.personalInfo || {};

    const employeeId = normalize(employment.employeeId);
    const email = normalize(personal.email || employment.email);
    const mobile = normalize(personal.mobile || employment.mobile);

    if (employeeId) employeeIds.add(employeeId);
    if (email) emails.add(email);
    if (mobile) mobiles.add(mobile);
  });

  const employeeId = normalize(employee.employeeId);
  const email = normalize(employee.email);
  const mobile = normalize(employee.mobile);

  if (employeeId && employeeIds.has(employeeId)) {
    return { field: "employeeId", message: "Employee ID already exists." };
  }

  if (email && emails.has(email)) {
    return { field: "email", message: "Email already exists." };
  }

  if (mobile && mobiles.has(mobile)) {
    return { field: "mobile", message: "Mobile number already exists." };
  }

  return null;
};

/*
| Frontend ke addEmployee (src/services/EmployeeService.js) jaisa hi record.
| Body ko seedha spread nahi karte — sirf wahi sections/keys jo form bhejta
| hai, taaki API se koi extra field DB me na ghus sake.
*/
const buildEmployeeRecord = (employee, employeeId) => {
  const personal = pick(employee.personalInfo, [
    "name",
    "email",
    "mobile",
    "address",
    "gender",
  ]);

  return {
    personalInfo: {
      ...personal,
      name: personal.name.trim(),
      email: personal.email.trim().toLowerCase(),
      mobile: personal.mobile.trim(),
      address: personal.address.trim(),
    },
    employmentInfo: {
      ...pick(employee.employmentInfo, [
        "department",
        "designation",
        "joiningDate",
        "employeeType",
      ]),
      employeeId,
    },
    bankInfo: pick(employee.bankInfo, [
      "bankName",
      "accountNumber",
      "ifsc",
      "branch",
    ]),
    documents: pick(employee.documents, ["aadhaar", "pan", "resume"]),
    account: {
      username: employeeId,
      password: employeeId,
      role: employee.account.role,
      status: "Active",
      isPasswordChanged: false,
    },
    createdAt: Date.now(),
  };
};

// Result { success, status, ... } lautata hai — status controller HTTP code banata hai
const createEmployee = async (companyCode, employee) => {
  const companySnapshot = await db
    .ref(`companies/${companyCode}/details`)
    .once("value");

  if (!companySnapshot.exists()) {
    return { success: false, status: 404, message: "Company not found." };
  }

  const employeeId = String(employee.employmentInfo.employeeId)
    .trim()
    .toUpperCase();

  const conflict = await findIdentityConflict(companyCode, {
    employeeId,
    email: employee.personalInfo?.email,
    mobile: employee.personalInfo?.mobile,
  });

  if (conflict) {
    return { success: false, status: 409, ...conflict };
  }

  /*
  | set() ki jagah transaction: check aur write ke beech agar kisi ne wahi
  | Employee ID bana diya ho, to purana record overwrite nahi hoga.
  */
  const { committed } = await db
    .ref(`companies/${companyCode}/employees/${employeeId}`)
    .transaction((current) =>            
      current === null ? buildEmployeeRecord(employee, employeeId) : undefined
    );

  if (!committed) {
    return {
      success: false,
      status: 409,
      field: "employeeId",
      message: "Employee ID already exists.",
    };
  }

  return {
    success: true,
    status: 201,
    message: "Employee created successfully.",
    data: { employeeId },
  };
};

/*
| Frontend ke getEmployees jaisa shape — { EMP001: {...} }, khaali ho to {}.
| Sirf account.password hataya hai: DB me plain text hai aur list wali
| screens (salary, payroll, departments) use nahi karti.
*/
const getEmployees = async (companyCode) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/employees`)
    .once("value");

  const employees = snapshot.val() || {};    //fb ko data mil gaya || data nhi hai

  return Object.fromEntries(
    Object.entries(employees).map(([employeeId, record]) => {
      const { password, ...account } = record.account || {};
      return [employeeId, { ...record, account }];
    })
  );
};

module.exports = {
  createEmployee,
  getEmployees,
};
