import { db, storage } from "../firebase/firebase";
import { ref, get, set, update } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { checkEmployeeUniqueness } from "./ValidationService";

// Add Employee
export const addEmployee = async (companyCode, employee) => {
  const employeeId = employee.employmentInfo.employeeId.trim().toUpperCase();
  const personal = employee.personalInfo || {};

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
        password: employeeId,
        role: employee.account.role,
        status: "Active",
        isPasswordChanged: false,
      },
      createdAt: Date.now(),
    }
  );
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

  await addEmployee(companyCode, employee);

  return {
    success: true,
    message: "Employee created successfully.",
  };
};
