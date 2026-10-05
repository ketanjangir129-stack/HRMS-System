const db = require("../config/firebase");
const {
  loadDepartments,
  toDepartmentRefs,
  withDepartmentNames,
  withDepartmentNamesAll,
} = require("../utils/departmentRefs");

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
const buildEmployeeRecord = (employee, employeeId, departmentRefs) => {
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
      ...pick(employee.employmentInfo, ["joiningDate", "employeeType"]),
      departmentId: departmentRefs.departmentId,
      designationId: departmentRefs.designationId,
      employeeId,
    },
    bankInfo: pick(employee.bankInfo, [
      "accountHolderName",
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

  if (!employee || typeof employee !== "object") {
    return {
      success: false,
      status: 400,
      message: "Invalid employee data.",
    };
  }

  if (!employee.personalInfo || typeof employee.personalInfo !== "object") {
    return {
      success: false,
      status: 400,
      field: "personalInfo",
      message: "Personal information is required.",
    };
  }

  if (!employee.employmentInfo || typeof employee.employmentInfo !== "object") {
    return {
      success: false,
      status: 400,
      field: "employmentInfo",
      message: "Employment information is required.",
    };
  }

  const { personalInfo, employmentInfo } = employee;

  if (!String(personalInfo.name ?? "").trim()) {
    return {
      success: false,
      status: 400,
      field: "name",
      message: "Name is required.",
    };
  }

  const name = String(personalInfo.name ?? "").trim();
  const nameRegex = /^[A-Za-z ]{3,50}$/;

  if (!nameRegex.test(name)) {
    return {
      success: false,
      status: 400,
      field: "name",
      message: "Enter a valid name.",
    };
  }
 
  if (!String(personalInfo.email ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "email",
    message: "Email is required.",
  };
}
const email = String(personalInfo.email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      success: false,
      status: 400,
      field: "email",
      message: "Please enter a valid email address.",
    };
  }

if (!String(personalInfo.mobile ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "mobile",
    message: "Mobile number is required.",
  };
}

const mobile = String(personalInfo.mobile ?? "").trim();

const mobileRegex = /^[6-9]\d{9}$/;

if (!mobileRegex.test(mobile)) {
  return {
    success: false,
    status: 400,
    field: "mobile",
    message: "Please enter a valid 10-digit mobile number.",
  };
}

if (!String(employmentInfo.employeeId ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "employeeId",
    message: "Employee ID is required.",
  };
}

const employeeId = String(employmentInfo.employeeId ?? "")
  .trim()
  .toUpperCase();

const employeeIdRegex = /^[A-Za-z0-9_-]{3,20}$/;

if (!employeeIdRegex.test(employeeId)) {
  return {
    success: false,
    status: 400,
    field: "employeeId",
    message:
      "Employee ID must be 3-20 characters and contain only letters, numbers, - or _.",
  };
}

if (!String(employmentInfo.joiningDate ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "joiningDate",
    message: "Joining date is required.",
  };
}

const joiningDate = String(employmentInfo.joiningDate ?? "").trim();

if (Number.isNaN(Date.parse(joiningDate))) {
  return {
    success: false,
    status: 400,
    field: "joiningDate",
    message: "Please enter a valid joining date.",
  };
}



if (!String(employmentInfo.employeeType ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "employeeType",
    message: "Employee type is required.",
  };
}

if (!String(employmentInfo.department ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "department",
    message: "Please select a department.",
  };
}
if (!String(employmentInfo.designation ?? "").trim()) {
  return {
    success: false,
    status: 400,
    field: "designation",
    message: "Please select a designation.",
  };
}

  // /Existing company/duplicate/department logic continues below...
  const companySnapshot = await db
    .ref(`companies/${companyCode}/details`)
    .once("value");

  if (!companySnapshot.exists()) {
    return { success: false, status: 404, message: "Company not found." };
  }


  const conflict = await findIdentityConflict(companyCode, {
    employeeId,
    email: employee.personalInfo?.email,
    mobile: employee.personalInfo?.mobile,
  });

  if (conflict) {
    return { success: false, status: 409, ...conflict };
  }

  // Form department/designation ka naam bhejta hai — DB me unki id jaati hai
  const departmentRefs = toDepartmentRefs(
    await loadDepartments(companyCode),
    employee.employmentInfo?.department,
    employee.employmentInfo?.designation
  );

  if (departmentRefs.error) {
    return { success: false, status: 400, ...departmentRefs.error };
  }

  const { committed } = await db
    .ref(`companies/${companyCode}/employees/${employeeId}`)
    .transaction((current) =>
      current === null
        ? buildEmployeeRecord(employee, employeeId, departmentRefs)
        : undefined
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
  const [snapshot, departments] = await Promise.all([
    db.ref(`companies/${companyCode}/employees`).once("value"),
    loadDepartments(companyCode),
  ]);

  const employees = snapshot.val() || {};    //fb ko data mil gaya || data nhi hai

  return withDepartmentNamesAll(
    Object.fromEntries(
      Object.entries(employees).map(([employeeId, record]) => {
        const { password, ...account } = record.account || {};
        return [employeeId, { ...record, account }];
      })
    ),
    departments
  );
};

/*
| Ek employee — Details page ke liye. Na mile to null (frontend ke
| getEmployeeById jaisa). getEmployees ki tarah account.password hataya hai.
*/
const getEmployeeById = async (companyCode, employeeId) => {
  const [snapshot, departments] = await Promise.all([
    db.ref(`companies/${companyCode}/employees/${employeeId}`).once("value"),
    loadDepartments(companyCode),
  ]);

  if (!snapshot.exists()) return null;

  const record = snapshot.val();
  const { password, ...account } = record.account || {};

  return withDepartmentNames({ ...record, account }, departments);
};

/*
| Details page jo keys edit karta hai (dob, uan, esic bhi — EmployeesDetails
| dikhata hai). employeeId kabhi editable nahi: wahi DB key hai.
*/
const EDITABLE_FIELDS = {
  personalInfo: ["name", "email", "mobile", "address", "gender", "dob", "fatherName", "motherName", "maritalStatus", "pincode", "city", "state", "alternateMobile"],
  employmentInfo: ["joiningDate", "employeeType"],
  bankInfo: ["accountHolderName", "bankName", "accountNumber", "ifsc", "branch"],
  documents: ["aadhaar", "pan", "resume", "uan", "esic"],
};

const updateEmployee = async (companyCode, employeeId, section, data) => {
  const employeeRef = db.ref(`companies/${companyCode}/employees/${employeeId}`);
  const snapshot = await employeeRef.once("value");

  if (!snapshot.exists()) {
    return { success: false, status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." };
  }

  const current = snapshot.val();

  // Sirf aayi hui whitelisted keys — partial update
  const fields = Object.fromEntries(
    EDITABLE_FIELDS[section]
      .filter((key) => key in data)
      .map((key) => [key, String(data[key] ?? "").trim()])
  );

  if (section === "personalInfo") {
  if ("name" in fields) {
    if (!fields.name) {
      return {
        success: false,
        status: 400,
        field: "name",
        message: "Name is required.",
      };
    }

    if (!/^[A-Za-z ]{3,50}$/.test(fields.name)) {
      return {
        success: false,
        status: 400,
        field: "name",
        message: "Enter a valid name.",
      };
    }
  }
  if ("email" in fields) {
  if (!fields.email) {
    return {
      success: false,
      status: 400,
      field: "email",
      message: "Email is required.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return {
      success: false,
      status: 400,
      field: "email",
      message: "Please enter a valid email address.",
    };
  }

  fields.email = fields.email.toLowerCase();
}
if ("mobile" in fields) {
  if (!fields.mobile) {
    return {
      success: false,
      status: 400,
      field: "mobile",
      message: "Mobile number is required.",
    };
  }

  if (!/^[6-9]\d{9}$/.test(fields.mobile)) {
    return {
      success: false,
      status: 400,
      field: "mobile",
      message: "Please enter a valid 10-digit mobile number.",
    };
  }
}
    // Sirf badli hui value check — warna apna hi email duplicate nikalta
    const currentEmail = normalize(current.personalInfo?.email || current.employmentInfo?.email);
    const currentMobile = normalize(current.personalInfo?.mobile || current.employmentInfo?.mobile);

    const conflict = await findIdentityConflict(companyCode, {
      email: "email" in fields && normalize(fields.email) !== currentEmail ? fields.email : "",
      mobile: "mobile" in fields && normalize(fields.mobile) !== currentMobile ? fields.mobile : "",
    });

    if (conflict) return { success: false, status: 409, ...conflict };
  }

  let departments;

  if (section === "employmentInfo") {
  if ("joiningDate" in fields) {
    if (!fields.joiningDate) {
      return {
        success: false,
        status: 400,
        field: "joiningDate",
        message: "Joining date is required.",
      };
    }

    if (Number.isNaN(Date.parse(fields.joiningDate))) {
      return {
        success: false,
        status: 400,
        field: "joiningDate",
        message: "Please enter a valid joining date.",
      };
    }
  }

if ("employeeType" in fields) {
  if (!fields.employeeType) {
    return {
      success: false,
      status: 400,
      field: "employeeType",
      message: "Employee type is required.",
    };
  }
}
  }

  // Form naam bhejta hai — DB me id jaati hai (createEmployee jaisa)
  if (section === "employmentInfo" && ("department" in data || "designation" in data)) {
    departments = await loadDepartments(companyCode);
    const refs = toDepartmentRefs(departments, data.department, data.designation);

    if (refs.error) return { success: false, status: 400, ...refs.error };

    fields.departmentId = refs.departmentId;
    fields.designationId = refs.designationId;
  }

  /*
  | Har key apne path par likhte hain ("employmentInfo/joiningDate"), poora
  | section object nahi — warna employmentInfo.employeeId jaisi keys jo form
  | nahi bhejta, mit jaatin.
  */
  const updates = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [`${section}/${key}`, value])
  );
  updates.updatedAt = Date.now();

  await employeeRef.update(updates);

  const sectionData = { ...(current[section] || {}), ...fields };

  return {
    success: true,
    status: 200,
    message: "Employee updated successfully.",
    data:
      section === "employmentInfo"
        ? withDepartmentNames(
          { employmentInfo: sectionData },
          departments ?? (await loadDepartments(companyCode))
        ).employmentInfo
        : sectionData,
  };
};

/*
| Status + manager ke departments chhodna — ek hi multi-path update me, taaki
| ya dono hon ya koi nahi (frontend me ye do alag writes the).
*/
const updateEmployeeStatus = async (companyCode, employeeId, nextStatus) => {
  const [snapshot, departments] = await Promise.all([
    db.ref(`companies/${companyCode}/employees/${employeeId}/account`).once("value"),
    loadDepartments(companyCode),
  ]);

  if (!snapshot.exists()) {
    return { success: false, status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found." };
  }

  const account = snapshot.val();

  if (account.status === nextStatus) {
    return { success: true, status: 200, message: `Employee is already ${nextStatus}.`, data: { employeeId, accountStatus: nextStatus, releasedDepartments: 0 } };
  }

  const updates = {
    [`employees/${employeeId}/account/status`]: nextStatus,
    [`employees/${employeeId}/account/statusUpdatedAt`]: Date.now(),
  };

  let releasedDepartments = 0;

  if (nextStatus === "Inactive" && account.role === "manager") {
    Object.entries(departments).forEach(([departmentId, department]) => {
      if (normalize(department?.manager?.employeeId) === normalize(employeeId)) {
        updates[`departments/${departmentId}/manager`] = null;
        releasedDepartments += 1;
      }
    });
  }

  await db.ref(`companies/${companyCode}`).update(updates);

  return {
    success: true,
    status: 200,
    message: nextStatus === "Inactive" ? "Employee deactivated." : "Employee activated.",
    data: { employeeId, accountStatus: nextStatus, releasedDepartments },
  };
};


module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
};
