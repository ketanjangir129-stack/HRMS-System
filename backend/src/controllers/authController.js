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

// companyCode DB path ka hissa hai — employeeController jaisa hi pattern
const COMPANY_CODE_PATTERN = /^[A-Z0-9]{3,10}$/;

// POST /api/auth/owner-token  body: { idToken, companyCode }
// Owner Firebase se login karta hai; yahan uske ID token ke badle wahi
// backend JWT milta hai jo HR/Employee ko /login se milta hai.
const ownerTokenExchange = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const companyCode = String(req.body?.companyCode ?? "")
      .trim()
      .toUpperCase();

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Owner ID token is required.",
      });
    }

    if (!COMPANY_CODE_PATTERN.test(companyCode)) {
      return res.status(400).json({
        success: false,
        message: "A valid company code is required.",
      });
    }

    const { status, ...result } = await authService.verifyOwner(
      idToken,
      companyCode
    );

    if (!result.success) {
      return res.status(status).json(result);
    }

    const token = tokenService.genrateOwnerToken({
      uid: result.uid,
      companyCode: result.companyCode,
    });

    return res.status(200).json({
      success: true,
      token,
      role: "owner",
      companyCode: result.companyCode,
    });
  } catch (error) {
    console.error("Owner token exchange error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
  ownerTokenExchange,
};