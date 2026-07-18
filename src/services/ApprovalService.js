import {db} from "../firebase/firebase"
import {ref , get , set,remove , update} from  "firebase/database";

export const approveOnboarding = async (
  companyCode,
  employeeId,
  approvedBy
) => {

  try {

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: "Failed to approve onboarding.",
    };

  }
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
  ...request,

  employeeId,

  status: "Active",

  approvedAt: Date.now(),

  approvedBy,
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