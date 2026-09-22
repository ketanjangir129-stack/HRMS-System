const passwordService = require("../services/passwordService");

const changePassword = async (req, res) => {
  try {
    // Whose password is changed comes from the verified token, never the
    // body — otherwise any caller could target another employee's account.
    const { companyCode, employeeId } = req.user;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
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