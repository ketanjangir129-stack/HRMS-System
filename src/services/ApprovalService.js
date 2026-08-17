import {db} from "../firebase/firebase"
import {ref , get , set,remove , update} from  "firebase/database";
import { provisionAuthUser } from "../firebase/secondaryAuth";
import { createEmployeeIndex } from "./userIndexService";
import {
  buildDefaultPassword,
  buildEmployeeEmail,
} from "../utils/auth/employeeIdentity";

// Onboarding requests store contact details in employmentInfo, but the
// employees node uses the personalInfo/employmentInfo/bankInfo shape that
// addEmployee writes. Map between the two so approved employees render the
// same as manually added ones.
const toEmployeeRecord = (request, employeeId) => {
  const employment = request.employmentInfo || {};
  const personal = request.personalInfo || {};
  const bank = request.bankInfo || {};
  const documents = request.documents || {};

  return {
    personalInfo: {
      name: employment.name || "",
      email: employment.email || "",
      mobile: employment.mobile || "",
      address: personal.address || "",
      gender: personal.gender || "",
      dob: personal.dob || "",
      fatherName: personal.fatherName || "",
      motherName: personal.motherName || "",
      maritalStatus: personal.maritalStatus || "",
      alternateMobile: personal.alternateMobile || "",
      city: personal.city || "",
      state: personal.state || "",
      pincode: personal.pincode || "",
    },

    employmentInfo: {
      employeeId,
      department: employment.department || "",
      designation: employment.designation || "",
      joiningDate: employment.joiningDate || "",
      employeeType: employment.employeeType || "",
      role: employment.role || "employee",
    },

    bankInfo: {
      bankName: bank.bankName || "",
      accountHolderName: bank.accountHolderName || "",
      accountNumber: bank.accountNumber || "",
      ifsc: bank.ifsc || bank.ifscCode || "",
      branch: bank.branch || bank.branchName || "",
    },

    documents: {
      aadhaar: documents.aadhaar || documents.aadhaarNumber || "",
      pan: documents.pan || documents.panNumber || "",
      uan: documents.uan || documents.uanNumber || "",
      esic: documents.esic || documents.esicNumber || "",
    },

    account: {
      ...(request.account || {}),
      // The onboarding request carried a plaintext password. Credentials now
      // live in Firebase Auth, and the rules refuse this field, so drop
      // whatever the request had rather than copying it across.
      password: null,
      status: "Active",
    },
  };
};

export const approveOnboarding = async (
  companyCode,
  employeeId,
  approvedBy
) => {

  try {

    const requestRef = ref(
      db,
      `companies/${companyCode}/onboardingRequests/${employeeId}`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: "Onboarding request not found.",
      };
    }

    const request = snapshot.val();

    const record = toEmployeeRecord(request, employeeId);

    /*
    | Approval is the moment the joiner becomes someone who can sign in, so it
    | is where their Firebase Auth account is created — same as addEmployee.
    | Done before any write, so a failure here leaves the request untouched and
    | still approvable.
    */
    const temporaryPassword = buildDefaultPassword(employeeId);

    const provision = await provisionAuthUser(
      buildEmployeeEmail(companyCode, employeeId),
      temporaryPassword
    );

    if (!provision.success) {
      return { success: false, message: provision.message };
    }

    const employee = {
      ...record,
      account: {
        ...record.account,
        uid: provision.uid,
        isPasswordChanged: false,
      },
      approvedAt: Date.now(),
      approvedBy,
      createdAt: request.createdAt || Date.now(),
    };

    await set(
      ref(
        db,
        `companies/${companyCode}/employees/${employeeId}`
      ),
      employee
    );

    await createEmployeeIndex({
      uid: provision.uid,
      companyCode,
      employeeId,
      role: employee.account.role || "employee",
    });

    const history = {
      employeeId,
      action: "Approved",
      approvedBy,
      approvedAt: Date.now(),
      request,
    };

    await set(
      ref(
        db,
        `companies/${companyCode}/onboardingHistory/${employeeId}`
      ),
      history
    );

    await remove(requestRef);

    return {
      success: true,
      message: "Employee onboarded successfully.",
      temporaryPassword,
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: "Failed to approve onboarding.",
    };

  }
};

export const rejectOnboarding = async (
  companyCode,
  employeeId,
  remarks,
  rejectedBy
) => {
  try {

    const requestRef = ref(
      db,
      `companies/${companyCode}/onboardingRequests/${employeeId}`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: "Onboarding request not found.",
      };
    }

    const request = snapshot.val();

    // Existing history
    const history = request.history || {};

    // Add new history event
    history[Date.now()] = {
      action: "Rejected",
      by: rejectedBy,
      remarks,
      time: Date.now(),
    };

    await update(requestRef, {
      status: "Rejected",
      remarks,
      rejectedBy,
      rejectedAt: Date.now(),
      history,
    });

    return {
      success: true,
      message: "Onboarding request rejected.",
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: "Failed to reject request.",
    };

  }
};
