const authService = require("../services/authService");
const tokenService = require("../services/tokenService")

const login = async (req, res) => {
  try {
    const {
      companyCode,
      userId,
      password,
    } = req.body;

    if (!companyCode || !userId || !password) {
      return res.status(400).json({
        success: false,
        message: "Company code, user ID and password are required.",
      });
    }

    // Employee login for now
    const result = await authService.loginEmployee(
      companyCode,
      userId,
      password
    );

    if (!result.success) {
      return res.status(401).json(result);
    }
    const token = tokenService.genrateToken(result.user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: result.user,
      role: result.role,
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};
const getCurrentUser = async (req, res) => {
  try {
    const { companyCode, employeeId } = req.user;

    const result = await authService.getEmployeeProfile(
      companyCode,
      employeeId
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json({
      success: true,
      user: result.user,
      role: result.user.role,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user.",
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
};