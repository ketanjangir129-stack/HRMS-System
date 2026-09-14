import {db} from "../firebase/firebase"
import {ref , get , set,remove , update} from  "firebase/database";

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
      status: "Active",
    },
  };
};

// What the approval email needs, pulled off the request while it is still
// here to read: the record itself is deleted a few lines later, and the
// account's password is only worth quoting while it is still the one the
// employee was given.
const toEmailRecipient = (request, employeeId) => {
  const employment = request.employmentInfo || {};
  const account = request.account || {};

  return {
    employeeId,
    name: employment.name || "",
    email: employment.email || "",
    designation: employment.designation || "",
    department: employment.department || "",
    joiningDate: employment.joiningDate || "",
    username: account.username || employeeId,
    temporaryPassword: account.isPasswordChanged
      ? ""
      : account.password || "",
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

    const employee = {
      ...toEmployeeRecord(request, employeeId),
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
      employee: toEmailRecipient(request, employeeId),
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: "Failed to approve onboarding.",
    };

  }
};

/*
| Many approvals, one at a time.
|
| Each request is its own read, write and delete, so the run is deliberately
| sequential rather than a Promise.all: a batch that half fails leaves every
| record it did reach fully approved, and the ones it did not exactly as they
| were. The caller gets both lists back and reports on them itself.
*/
export const approveOnboardingRequests = async (
  companyCode,
  employeeIds = [],
  approvedBy
) => {

  const approved = [];
  const failed = [];

  for (const employeeId of employeeIds) {

    const result = await approveOnboarding(
      companyCode,
      employeeId,
      approvedBy
    );

    if (result.success) {

      approved.push({
        employeeId,
        employee: result.employee,
      });

      continue;
    }

    failed.push({
      employeeId,
      message: result.message,
    });

  }

  return { approved, failed };
};

// Stamped after the approval email has already left, which is why it
// swallows its own failures: the email is gone either way, and a screen told
// "not sent" because a timestamp would not write would send it a second time.
//
// The employee is read first so a stamp for a record that has since been
// deleted cannot recreate it as a stub.
export const markApprovalEmailSent = async (companyCode, employeeId) => {

  if (!companyCode || !employeeId) {
    return false;
  }

  try {

    const employeeRef = ref(
      db,
      `companies/${companyCode}/employees/${employeeId}`
    );

    const snapshot = await get(employeeRef);

    if (!snapshot.exists()) {
      return false;
    }

    await update(employeeRef, {
      approvalEmailSentAt: Date.now(),
    });

    return true;

  } catch (error) {

    console.error("Could not stamp the approval email as sent:", error);

    return false;

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

/*
| Many rejections, under one set of remarks — the same reason is written onto
| every request the run touches. Sequential and partial for the same reason
| the bulk approval is: what was rejected stays rejected, what failed is
| handed back so the screen can name it.
*/
export const rejectOnboardingRequests = async (
  companyCode,
  employeeIds = [],
  remarks,
  rejectedBy
) => {

  const rejected = [];
  const failed = [];

  for (const employeeId of employeeIds) {

    const result = await rejectOnboarding(
      companyCode,
      employeeId,
      remarks,
      rejectedBy
    );

    if (result.success) {
      rejected.push({ employeeId });
      continue;
    }

    failed.push({
      employeeId,
      message: result.message,
    });

  }

  return { rejected, failed };
};
