import { db, storage } from "../firebase/firebase";
import { ref, get, set, update } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { checkEmployeeUniqueness } from "./ValidationService";
import { provisionAuthUser } from "../firebase/secondaryAuth";
import { createEmployeeIndex, syncUserIndex } from "./userIndexService";
import {
  buildDefaultPassword,
  buildEmployeeEmail,
} from "../utils/auth/employeeIdentity";

/*
| Adding an employee now creates three things, in this order:
|
|   1. a Firebase Auth account, so the employee has a uid to sign in with
|   2. the employee record
|   3. the /userIndex row that tells the security rules which company and role
|      that uid has
|
| The account is created through a second Firebase app instance — see
| firebase/secondaryAuth.js — because doing it on the primary one would sign
| the HR who clicked "Add Employee" out of their own session.
|
| No password is written to the database. The rules refuse it outright now.
*/
export const addEmployee = async (companyCode, employee) => {
  const employeeId = employee.employmentInfo.employeeId.trim().toUpperCase();
  const personal = employee.personalInfo || {};

  const temporaryPassword = buildDefaultPassword(employeeId);

  const provision = await provisionAuthUser(
    buildEmployeeEmail(companyCode, employeeId),
    temporaryPassword
  );

  if (!provision.success) {
    return { success: false, message: provision.message };
  }

  await set(
    ref(db, `companies/${companyCode}/employees/${employeeId}`),
    {
      ...employee,
      // Duplicate check trim/lowercase karke compare karta hai, isliye
      // store bhi ussi tarah karo — warna DB me " Ketan " aur "A@X.COM" jaisi
      // values bach jaati hain jo aage har comparison ko todti hain.
      personalInfo: {
        ...personal,
        name: personal.name?.trim() || "",
        email: personal.email?.trim().toLowerCase() || "",
        mobile: personal.mobile?.trim() || "",
        address: personal.address?.trim() || "",
      },
      employmentInfo: {
        ...employee.employmentInfo,
        employeeId,
      },
      account: {
        username: employeeId,
        uid: provision.uid,
        role: employee.account.role,
        status: "Active",
        isPasswordChanged: false,
      },
      createdAt: Date.now(),
    }
  );

  await createEmployeeIndex({
    uid: provision.uid,
    companyCode,
    employeeId,
    role: employee.account.role,
  });

  return { success: true, temporaryPassword };
};


// Get All Employees
export const getEmployees = async (companyCode) => {
  const snapshot = await get(
    ref(db, `companies/${companyCode}/employees`)
  );

  return snapshot.exists() ? snapshot.val() : {};
};

// Get Employee By ID
export const getEmployeeById = async (
  companyCode,
  employeeId
) => {
  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees/${employeeId.toUpperCase()}`
    )
  );

  return snapshot.exists() ? snapshot.val() : null;
};


// Update one section of an employee (e.g. { personalInfo: {...} })
export const updateEmployee = async (companyCode, employeeId, data) => {
  await update(
    ref(db, `companies/${companyCode}/employees/${employeeId.toUpperCase()}`),
    data
  );
};

// Details page ka section save — updateEmployee ke upar ek patli layer.
// personalInfo ke liye email/mobile ka duplicate check + trim/lowercase karti hai.
export const updateEmployeeSection = async (
  companyCode,
  employeeId,
  sectionId,
  sectionData
) => {
  if (sectionId !== "personalInfo") {
    await updateEmployee(companyCode, employeeId, { [sectionId]: sectionData });
    return { success: true, data: sectionData };
  }

  const nextData = {
    ...sectionData,
    name: sectionData.name?.trim() || "",
    email: sectionData.email?.trim().toLowerCase() || "",
    mobile: sectionData.mobile?.trim() || "",
    address: sectionData.address?.trim() || "",
  };

  const current = await getEmployeeById(companyCode, employeeId);

  const currentEmail = (
    current?.personalInfo?.email ||
    current?.employmentInfo?.email ||
    ""
  ).trim().toLowerCase();

  const currentMobile = (
    current?.personalInfo?.mobile ||
    current?.employmentInfo?.mobile ||
    ""
  ).trim();

  // Sirf badli hui value check karo — warna khud ka hi email duplicate nikal aayega
  const duplicate = await checkEmployeeUniqueness(companyCode, {
    email: nextData.email !== currentEmail ? nextData.email : undefined,
    mobile: nextData.mobile !== currentMobile ? nextData.mobile : undefined,
  });

  if (!duplicate.success) {
    return duplicate;
  }

  await updateEmployee(companyCode, employeeId, { personalInfo: nextData });

  return { success: true, data: nextData };
};

// Resume upload — PDF Storage mein jaata hai, DB mein sirf uska link save hota hai
export const uploadResume = async (companyCode, employeeId, file) => {
  const fileRef = storageRef(
    storage,
    `companies/${companyCode}/employees/${employeeId.toUpperCase()}/resume.pdf`
  );

  await uploadBytes(fileRef, file, { contentType: "application/pdf" });

  return await getDownloadURL(fileRef);
};

// CREATE THE EMPLOYEES
export const createEmployee = async (companyCode, employee) => {
  // Onboarding wala hi check use karte hain — wo employees ke saath
  // pending onboardingRequests bhi dekhta hai, aur email/mobile ko
  // personalInfo + employmentInfo dono me dhoondhta hai.
  const result = await checkEmployeeUniqueness(companyCode, {
    employeeId: employee.employmentInfo?.employeeId,
    email: employee.personalInfo?.email,
    mobile: employee.personalInfo?.mobile,
  });

  if (!result.success) {
    return result;
  }

  const created = await addEmployee(companyCode, employee);

  // Auth account creation can fail on its own (an ID reused after a delete),
  // and it fails before anything is written, so pass it straight back.
  if (!created.success) {
    return created;
  }

  return {
    success: true,
    message: "Employee created successfully.",
    temporaryPassword: created.temporaryPassword,
  };
};

/*
| Role and status are stored twice: on the employee record, where HR edits
| them, and on the /userIndex row, where the security rules read them. Change
| one without the other and a demoted HR keeps manager access until they are
| deleted. Route those two fields through here.
*/
export const updateEmployeeAccount = async (
  companyCode,
  employeeId,
  changes
) => {
  const employee = await getEmployeeById(companyCode, employeeId);

  if (!employee) {
    return { success: false, message: "Employee not found." };
  }

  const updates = {};

  if (changes.role !== undefined) updates["account/role"] = changes.role;
  if (changes.status !== undefined) updates["account/status"] = changes.status;

  await updateEmployee(companyCode, employeeId, updates);

  // Pre-migration records have no uid; there is no index row to keep in step.
  if (employee.account?.uid) {
    await syncUserIndex(employee.account.uid, {
      ...(changes.role !== undefined ? { role: changes.role } : {}),
      ...(changes.status !== undefined ? { status: changes.status } : {}),
    });
  }

  return { success: true };
};
