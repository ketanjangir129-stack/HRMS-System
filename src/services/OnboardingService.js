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

    const invitationLink = `${window.location.origin}/onboarding/${companyCode}/${employeeId}`;
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
  employmentInfo: {
             employeeId,

            name: basicInfo.name.trim(),

            email: basicInfo.email.trim(),

            mobile: basicInfo.mobile.trim(),

            department: basicInfo.department,

            designation: basicInfo.designation,
            joiningDate: basicInfo.joiningDate,
            employeeType: basicInfo.employeeType
,
        },
        invitationLink,

        personalInfo: {},

        bankInfo: {},

        salaryInfo: {},

        documents: {},

        status: "Invitation Sent",

        createdAt: Date.now(),
        updatedAt: Date.now(),

        submittedAt: null,

        approvedAt: null,
    });

    return {
        success: true,
        message:"Onboarding request created successfully.",
        invitationLink,
    };
};
export const getOnboardingHistory = async (companyCode) => {

    const requestRef = ref(
        db,
        `companies/${companyCode}/onboardingHistory`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
        return [];
    }

    const data = snapshot.val();

    return Object.keys(data).map((id) => ({
        id,
        ...data[id],
    }));
};


export const getOnboardingRequests = async (companyCode) => {

    const requestRef = ref(
        db,
        `companies/${companyCode}/onboardingRequests`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
        return [];
    }

    const data = snapshot.val();

    return Object.keys(data).map((id) => ({
        id,
        ...data[id],
    }));
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

export const submitOnboardingForm = async (
    companyCode,
    employeeId,
    formData
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
                message: "Request not found",
            };
        }

        const existingData = snapshot.val();

        if (
            existingData.status === "Pending Approval" ||
            existingData.status === "Approved"
            ) {
            return {
                success: false,
                message:"Onboarding form already submitted.",
            };
        }

        await set(requestRef, {...existingData,

            personalInfo: {
                fatherName: formData.fatherName,
                motherName: formData.motherName,
                dob: formData.dob,
                gender: formData.gender,
                maritalStatus: formData.maritalStatus,

                personalMobile: formData.personalMobile,
                alternateMobile: formData.alternateMobile,

                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
            },

            education: existingData.education || {},
            experience: existingData.experience || {},

            bankInfo: {
                accountHolderName: formData.accountHolderName,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                branchName: formData.branchName,
            },

            documents: {
                aadhaarNumber: formData.aadhaarNumber,
                panNumber: formData.panNumber,
                uanNumber: formData.uanNumber,
                esicNumber: formData.esicNumber,
            },

            status: "Pending Approval",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return {
            success: true,
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            message: error.message,
        };

    }
};