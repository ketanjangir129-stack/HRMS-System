import {db} from "../firebase/firebase"
import {ref , get , set,remove , update} from  "firebase/database";

// Onboarding requests are stored as basic/personal/bank/documents, but the
// employees node uses the personalInfo/employmentInfo/bankInfo shape that
// addEmployee writes. Map between the two so approved employees render the
// same as manually added ones.
const toEmployeeRecord = (request, employeeId) => {
  const basic = request.basic || {};
  const personal = request.personal || {};
  const bank = request.bank || {};
  const documents = request.documents || {};

  return {
    personalInfo: {
      name: basic.name || "",
      email: basic.email || "",
      mobile: basic.mobile || "",
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
      department: basic.department || "",
      designation: basic.designation || "",
      joiningDate: request.employment?.joiningDate || "",
      employeeType: request.employment?.employeeType || "",
    },

    bankInfo: {
      bankName: bank.bankName || "",
      accountHolderName: bank.accountHolderName || "",
      accountNumber: bank.accountNumber || "",
      ifsc: bank.ifscCode || "",
      branch: bank.branchName || "",
    },

    documents: {
      aadhaar: documents.aadhaarNumber || "",
      pan: documents.panNumber || "",
      uan: documents.uanNumber || "",
      esic: documents.esicNumber || "",
    },

    account: {
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