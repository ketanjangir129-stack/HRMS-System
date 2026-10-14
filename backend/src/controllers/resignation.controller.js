const resignationService = require("../services/resignation.service");
const {
  verifyCompanyAccess,
  verifyEmployeeOwner,
  verifyManager,
  verifyHR,
  verifyFinance,
  verifyOwner,
  getViewerEmployee,
  isFinanceMember,
  verifyOwnerDecidesManagerResignation,
} = require("../auth/resignation.authorization");

const buildActor = (req) => ({
  uid: req.user?.uid || null,
  employeeId: req.user?.employeeId || null,
  name:
    req.user?.name ||
    req.user?.employeeName ||
    null,
  role: req.user?.role || null,
  companyCode: req.user?.companyCode || null,
});

const sendSuccess = (res, data, message = "Success.") => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

const handleError = (res, error) => {
  console.error("Resignation controller error:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || "INTERNAL_SERVER_ERROR",
    message:
      error.message || "Something went wrong. Please try again.",
  });
};

/**
 * POST
 * Create resignation
 */
const createResignation = async (req, res) => {
  try {
    const { companyCode } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const actor = buildActor(req);

    const body = req.body || {};

    // Frontend sends { employee: { employeeId, name, ... }, ... }.
    // Accept object, plain ID string, or fallback to the logged-in user.
    const bodyEmployee = body.employee;
    const requestedEmployeeId =
      (bodyEmployee && typeof bodyEmployee === "object"
        ? bodyEmployee.employeeId
        : bodyEmployee) ||
      body.employeeId ||
      req.user.employeeId;

    // Employees may only file for themselves; HR/owner may file on behalf.
    const callerRole = String(req.user?.role || "").toLowerCase();
    const callerId = String(req.user?.employeeId || "").trim().toUpperCase();
    const targetId = String(requestedEmployeeId || "").trim().toUpperCase();
    if (
      targetId &&
      callerId &&
      targetId !== callerId &&
      !["hr", "hr_admin", "owner"].includes(callerRole)
    ) {
      const error = new Error("You can only submit resignation for yourself.");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    const result = await resignationService.createResignation({
      companyCode,
      employeeId: requestedEmployeeId || req.user.employeeId,
      employee:
        bodyEmployee && typeof bodyEmployee === "object"
          ? bodyEmployee
          : null,

      reasonCategory: body.reasonCategory,
      reason: body.reason,
      lastWorkingDay: body.lastWorkingDay,
      noticePeriodDays: body.noticePeriodDays,

      actor,
    });

    return res.status(201).json({
      success: true,
      message: "Resignation submitted successfully.",
      data: result,
      resignation: result,
      resignationId: result?.resignationId || null,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET
 * List resignations visible to the logged-in user.
 * HR/owner see all, managers see their departments + own,
 * everyone else sees own.
 */
const getEmployeeResignations = async (req, res) => {
  try {
    const { companyCode } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const result =
      await resignationService.getResignationsForViewer({
        companyCode,
        employeeId: req.user.employeeId,
        role: req.user.role,
      });

    return sendSuccess(
      res,
      result,
      "Employee resignations fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET
 * Get resignation by ID
 */
const getResignationById = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const role = String(req.user?.role || "").toLowerCase();

    /*
    | Ownership is checked before role. A manager resigning themself must read
    | their own equipment form and settlement exactly like any other resigner —
    | without this they fall into the manager branch and fail verifyManager
    | with "You are not the assigned manager for this employee."
    */
    const existing =
      await resignationService.getResignationById({
        companyCode,
        resignationId,
      });

    const callerId = String(req.user?.employeeId || "")
      .trim()
      .toUpperCase();

    const recordId = String(existing?.employeeId || "")
      .trim()
      .toUpperCase();

    if (callerId && recordId && callerId === recordId) {
      return sendSuccess(
        res,
        existing,
        "Resignation fetched successfully."
      );
    }

    let result = existing;

    if (role === "owner") {
      // No further check — already loaded above.
    } else if (["hr", "hr_admin"].includes(role)) {
      // No further check — already loaded above.
    } else if (
      String(existing?.status || "").trim().toUpperCase() ===
        "FINANCE_PENDING" ||
      String(existing?.status || "").trim().toLowerCase() ===
        "finance approval pending"
    ) {
      // Finance members read the settlements waiting on them. Roles stay
      // owner / hr / manager / employee — membership comes from the viewer's
      // Finance department + Finance Executive / Finance Manager designation.
      const viewer = await getViewerEmployee(companyCode, req.user);

      if (!isFinanceMember(viewer)) {
        const error = new Error(
          "You are not authorized to access this resignation."
        );
        error.statusCode = 403;
        throw error;
      }
    } else if (role === "manager") {
      result = await verifyManager({
        companyCode,
        resignationId,
        user: req.user,
      });
    } else {
      result = await verifyEmployeeOwner({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    return sendSuccess(
      res,
      result,
      "Resignation fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Manager approves resignation
 */
const approveByManager = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    // A manager's resignation is decided by the owner alone. The owner
    // holds no department, so the regular manager check is skipped for them.
    const managerGate = await verifyOwnerDecidesManagerResignation({
      companyCode,
      resignationId,
      user: req.user,
    });

    if (!managerGate.applies) {
      await verifyManager({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    const actor = buildActor(req);

    const result =
      await resignationService.approveByManager({
        companyCode,
        resignationId,
        actor,
        lastWorkingDay: (req.body || {}).lastWorkingDay,
        remarks: (req.body || {}).remarks || "",
      });

    return sendSuccess(
      res,
      result,
      "Resignation approved by manager successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Manager rejects resignation
 */
const rejectByManager = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const managerGate = await verifyOwnerDecidesManagerResignation({
      companyCode,
      resignationId,
      user: req.user,
    });

    if (!managerGate.applies) {
      await verifyManager({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    const actor = buildActor(req);

    const result =
      await resignationService.rejectByManager({
        companyCode,
        resignationId,
        actor,
        reason: req.body.reason,
      });

    return sendSuccess(
      res,
      result,
      "Resignation rejected by manager."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * HR approves resignation
 */
const approveByHr = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyHR({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result =
      await resignationService.approveByHr({
        companyCode,
        resignationId,
        actor,
        lastWorkingDay: req.body.lastWorkingDay,
        remarks: req.body.remarks || "",
      });

    return sendSuccess(
      res,
      result,
      "Resignation approved by HR successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * HR rejects resignation
 */
const rejectByHr = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyHR({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result =
      await resignationService.rejectByHr({
        companyCode,
        resignationId,
        actor,
        reason: req.body.reason,
      });

    return sendSuccess(
      res,
      result,
      "Resignation rejected by HR."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Employee submits equipment
 */
const submitEquipment = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyEmployeeOwner({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result =
      await resignationService.submitEquipment({
        companyCode,
        resignationId,
        actor,
        equipment: req.body.equipment,
        remarks: req.body.remarks || "",
      });

    return sendSuccess(
      res,
      result,
      "Equipment details submitted successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Attach the Cloudinary URL of the filing-time document.
 *
 * The file itself is uploaded through POST /api/upload/file — this only pins
 * the resulting URL onto the record. The filer owns the upload, so the owner
 * (who may file on someone's behalf) is allowed alongside the resigner.
 */
const attachDocument = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const role = String(req.user?.role || "").toLowerCase();

    if (role === "owner") {
      await resignationService.getResignationById({
        companyCode,
        resignationId,
      });
    } else {
      await verifyEmployeeOwner({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    const result =
      await resignationService.attachDocument({
        companyCode,
        resignationId,
        documentUrl: (req.body || {}).documentUrl,
      });

    return sendSuccess(
      res,
      result,
      "Document attached successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Save F&F draft
 */
const saveFnF = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const role = String(req.user?.role || "").toLowerCase();

    if (["hr", "hr_admin", "owner"].includes(role)) {
      // HR / owner prepare the settlement — just ensure it exists (404 if not).
      await resignationService.getResignationById({
        companyCode,
        resignationId,
      });
    } else {
      await verifyEmployeeOwner({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    const actor = buildActor(req);

    const body = req.body || {};

    // Accept all three shapes:
    // 1. { fnf: { values, notes, derivation } }  (documented API shape)
    // 2. { values, notes, derivation }           (frontend worksheet shape)
    // 3. { salaryPayable, ... }                 (bare field map, e.g. manual API test)
    let fnf = body.fnf ?? body;
    if (
      fnf &&
      typeof fnf === "object" &&
      !Array.isArray(fnf) &&
      fnf.values === undefined &&
      Object.keys(fnf).length > 0
    ) {
      fnf = { values: fnf };
    }

    const result = await resignationService.saveFnF({
      companyCode,
      resignationId,
      actor,
      fnf,
    });

    return sendSuccess(
      res,
      result,
      "F&F details saved successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * POST
 * Submit F&F for review
 */
const submitFnFForReview = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    const submitRole = String(req.user?.role || "").toLowerCase();

    if (["hr", "hr_admin", "owner"].includes(submitRole)) {
      await resignationService.getResignationById({
        companyCode,
        resignationId,
      });
    } else {
      await verifyEmployeeOwner({
        companyCode,
        resignationId,
        user: req.user,
      });
    }

    const actor = buildActor(req);

    const result =
      await resignationService.submitFnFForReview({
        companyCode,
        resignationId,
        actor,
      });

    return sendSuccess(
      res,
      result,
      "F&F submitted for review successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * HR reviews F&F
 */
const reviewFnF = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyHR({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result = await resignationService.reviewFnF({
      companyCode,
      resignationId,
      actor,
      remarks: req.body.remarks || "",
    });

    return sendSuccess(
      res,
      result,
      "F&F reviewed successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * HR returns F&F
 */
const returnFnF = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyHR({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result = await resignationService.returnFnF({
      companyCode,
      resignationId,
      actor,
      reason: req.body.reason,
    });

    return sendSuccess(
      res,
      result,
      "F&F returned to employee."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH
 * Finance approves and exits employee
 */
const approveFinanceAndExit = async (req, res) => {
  try {
    const { companyCode, resignationId } = req.params;

    verifyCompanyAccess({
      companyCode,
      user: req.user,
    });

    await verifyFinance({
      companyCode,
      resignationId,
      user: req.user,
    });

    const actor = buildActor(req);

    const result =
      await resignationService.approveFinanceAndExit({
        companyCode,
        resignationId,
        actor,
        remarks: req.body.remarks || "",
      });

    return sendSuccess(
      res,
      result,
      "Finance approved resignation and employee exited successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createResignation,
  getEmployeeResignations,
  getResignationById,

  approveByManager,
  rejectByManager,

  approveByHr,
  rejectByHr,

  submitEquipment,

  attachDocument,

  saveFnF,
  submitFnFForReview,
  reviewFnF,
  returnFnF,

  approveFinanceAndExit,
};