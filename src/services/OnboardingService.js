import { db } from "../firebase/firebase";
import {
    ref,
    get,
    set,
    remove,
}
    from "firebase/database";
import { checkEmployeeUniqueness } from "./ValidationService";
export const createOnboardingRequest = async (
    companyCode,
    basicInfo
) => {
    const employeeId = basicInfo.employeeId
        .trim()
        .toUpperCase();
    const validation =
        await checkEmployeeUniqueness(
            companyCode,
            basicInfo
        );

    if (!validation.success) {
        return validation;
    }


    const onboardingRef = ref(
        db,
        `companies/${companyCode}/onboardingRequests/${employeeId}`
    );

    await set(onboardingRef, {
        basic: {
            name: basicInfo.name.trim(),

            email: basicInfo.email.trim(),

            mobile: basicInfo.mobile.trim(),

            department: basicInfo.department,

            designation: basicInfo.designation,
        },

        personal: {},

        employment: {},

        salary: {},

        documents: {},

        status: "Invitation Sent",

        createdAt: Date.now(),
        updatedAt: Date.now(),

        submittedAt: null,

        approvedAt: null,
    });

    return {
        success: true,
        message: "Onboarding request created successfully.",
    };
};

export const getOnboardingRequestById = async (
  companyCode,
  requestId
) => {
  try {
    const requestRef = ref(
      db,
      `companies/${companyCode}/onboardingRequests/${requestId}`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.key,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error("Error fetching onboarding request:", error);
    throw error;
  }
};