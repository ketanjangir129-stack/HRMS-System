const passwordService = require("../services/passwordService");

const changePassword = async (req, res) => {
  try {
    const {
      companyCode,
      employeeId,
      currentPassword,
      newPassword,
    } = req.body;

    // Validate required fields
    if (
      !companyCode ||
      !employeeId ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Company code, employee ID, current password and new password are required.",
      });
    }

    // Basic password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const result =
      await passwordService.changeEmployeePassword(
        companyCode,
        employeeId,
        currentPassword,
        newPassword
      );

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password.",
    });
  }
};

module.exports = {
  changePassword,
};