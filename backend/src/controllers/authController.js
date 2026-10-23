const authService = require("../services/authService");
const tokenService = require("../services/tokenService")

const login = async (req, res) => {
  try {
    const {
      companyCode,
      userId,
      password,
    } = req.body || {};

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

// Frontend ke utils/validation/rules.js jaise hi — browser ki validation
// bypass karke seedhi request aaye tab bhi wahi data DB tak pahunchta hai
const REGISTER_RULES = {
  companyName: {
    pattern: /^[A-Za-z0-9&.,'()\- ]{3,100}$/,
    message: "Enter a valid company name.",
  },
  companyCode: {
    pattern: COMPANY_CODE_PATTERN,
    message: "Company code must contain only uppercase letters and numbers.",
  },
  ownerName: {
    pattern: /^[A-Za-z ]{3,50}$/,
    message: "Enter a valid owner name.",
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter a valid email.",
  },
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&]).{8,20}$/,
    message:
      "Password must contain uppercase, lowercase, number and special character.",
  },
  mobile: {
    pattern: /^[6-9]\d{9}$/,
    message: "Enter a valid mobile number.",
  },
  address: {
    pattern: /^.{10,200}$/,
    message: "Address must be between 10 and 200 characters.",
  },
};

// POST /api/auth/register-company
// body: { companyName, companyCode, ownerName, email, password, mobile, address }
const registerCompany = async (req, res) => {
  try {
    const body = req.body || {};

    // Password trim nahi hota — jo type kiya wahi Firebase me jaata hai
    const input = {
      companyName: String(body.companyName ?? "").trim(),
      companyCode: String(body.companyCode ?? "").trim().toUpperCase(),
      ownerName: String(body.ownerName ?? "").trim(),
      email: String(body.email ?? "").trim().toLowerCase(),
      password: String(body.password ?? ""),
      mobile: String(body.mobile ?? "").trim(),
      address: String(body.address ?? "").trim(),
    };

    const errors = {};

    Object.entries(REGISTER_RULES).forEach(([field, rule]) => {
      if (!rule.pattern.test(input[field])) {
        errors[field] = rule.message;
      }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted fields.",
        errors,
      });
    }

    const { status, ...result } = await authService.registerCompany(input);

    if (!result.success) {
      return res.status(status).json({
        success: false,
        message: result.message,
        errors: result.field ? { [result.field]: result.message } : undefined,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Company registered successfully.",
      company: result.company,
    });
  } catch (error) {
    console.error("Register company error:", error);

    return res.status(500).json({
      success: false,
      message: "Company registration failed.",
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
  ownerTokenExchange,
  registerCompany,
};