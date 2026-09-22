const db = require("../config/firebase");

const changeEmployeePassword = async (
    companyCode,
    employeeId,
    currentPassword,
    newPassword
) => {
    const normalizedEmployeeId = employeeId.toUpperCase();

    const employeeRef = db.ref(
        `companies/${companyCode}/employees/${normalizedEmployeeId}`
    );
    const snapshot = await employeeRef.once("value");

    if (!snapshot.exists()) {
        return {
            success: false,
            message: "Employee not found.",
        }
    }

    const employee = snapshot.val();

    if (!employee.account) {
        return {
            success: false,
            message: "Employee account is not configured.",
        };
    }
    if (employee.account.status !== "Active") {
        return {
            success: false,
            message: "Account is inactive.",
        };
    }

    // Verify current password
    if (employee.account.password !== currentPassword) {
        return {
            success: false,
            message: "Current password is incorrect.",
        }
    }
    // Prevent same password 
    if (currentPassword == newPassword) {
        return {
            success: false,
            message: "New password must be differrent form current password.",

        };
    }
    // Update password 

    await employeeRef.update({
        "account/password": newPassword,
        "account/isPasswordChanged": true,
    });
    return {
        success: true,
        message: "Password changed sucessfully.",

    };
};

module.exports = {
    changeEmployeePassword,
}