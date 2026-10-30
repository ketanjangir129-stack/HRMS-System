const onboardingService = require("../services/onboardingService");

const sendResult = (res, result, fallbackStatus = 200) => {
  const { status, ...payload } = result || {};
  return res.status(status || fallbackStatus).json(payload);
};

const handleError = (res, error, fallbackMessage) => {
  console.error("Onboarding controller error:", error);
  const status = Number(error.statusCode) || 500;
  return res.status(status).json({
    success: false,
    code: error.code || (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message: status < 500 ? error.message : fallbackMessage || "An unexpected error occurred.",
  });
};

const getActorId = (user) => {
  if (user?.role === "owner") return "owner";
  return user?.employeeId || user?.username || "";
};

const getOrigin = (req) => {
  return (
    req.body?.origin ||
    req.headers.origin ||
    req.headers.referer?.replace(/\/$/, "") ||
    ""
  );
};

// ==========================================
// Public Candidate Endpoints
// ==========================================

const getPublicRequest = async (req, res) => {
  try {
    const { companyCode, employeeId } = req.params;
    if (!companyCode || !employeeId) {
      return res.status(400).json({
        success: false,
        message: "Company code and employee ID are required.",
      });
    }

    const request = await onboardingService.getOnboardingRequestById(
      companyCode,
      employeeId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Onboarding request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return handleError(res, error, "Unable to load onboarding request.");
  }
};

const submitPublicForm = async (req, res) => {
  try {
    const { companyCode, employeeId } = req.params;
    const formData = req.body || {};
    const files = req.files || {};

    if (!companyCode || !employeeId) {
      return res.status(400).json({
        success: false,
        message: "Company code and employee ID are required.",
      });
    }

    const result = await onboardingService.submitOnboardingForm(
      companyCode,
      employeeId,
      formData,
      files
    );

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Unable to submit onboarding form.");
  }
};

// ==========================================
// Protected HR/Admin Endpoints
// ==========================================

const getRequests = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const requests = await onboardingService.getOnboardingRequests(companyCode);

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return handleError(res, error, "Unable to fetch onboarding requests.");
  }
};

const getRequestById = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { employeeId } = req.params;

    const request = await onboardingService.getOnboardingRequestById(
      companyCode,
      employeeId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Onboarding request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return handleError(res, error, "Unable to fetch onboarding request.");
  }
};

const createSingle = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeInfo = req.body?.employeeInfo || req.body || {};
    const origin = getOrigin(req);

    const result = await onboardingService.createOnboardingRequest(
      companyCode,
      employeeInfo,
      origin
    );

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Unable to create onboarding request.");
  }
};

const createBulk = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employees = req.body?.employees || [];
    const origin = getOrigin(req);

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Employees list is required.",
      });
    }

    // The page aborts the request when the user cancels a running batch; the
    // connection closing before we respond is the signal to stop the loop.
    let cancelled = false;
    res.on("close", () => {
      if (!res.writableEnded) {
        cancelled = true;
      }
    });

    const results = await onboardingService.createBulkOnboardingRequests(
      companyCode,
      employees,
      origin,
      () => cancelled
    );

    if (cancelled) {
      return;
    }

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    return handleError(res, error, "Unable to process bulk onboarding.");
  }
};

const approveSingle = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeId = req.body?.employeeId || req.params?.employeeId;
    const approvedBy = getActorId(req.user);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    const result = await onboardingService.approveOnboarding(
      companyCode,
      employeeId,
      approvedBy
    );

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Unable to approve onboarding request.");
  }
};

const approveBatch = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeIds = req.body?.employeeIds || [];
    const approvedBy = getActorId(req.user);

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Employee IDs array is required.",
      });
    }

    const result = await onboardingService.approveOnboardingRequests(
      companyCode,
      employeeIds,
      approvedBy
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "Unable to approve onboarding requests.");
  }
};

const rejectSingle = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeId = req.body?.employeeId || req.params?.employeeId;
    const remarks = req.body?.remarks || "";
    const rejectedBy = getActorId(req.user);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    const result = await onboardingService.rejectOnboarding(
      companyCode,
      employeeId,
      remarks,
      rejectedBy
    );

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Unable to reject onboarding request.");
  }
};

const rejectBatch = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeIds = req.body?.employeeIds || [];
    const remarks = req.body?.remarks || "";
    const rejectedBy = getActorId(req.user);

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Employee IDs array is required.",
      });
    }

    const result = await onboardingService.rejectOnboardingRequests(
      companyCode,
      employeeIds,
      remarks,
      rejectedBy
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "Unable to reject onboarding requests.");
  }
};

const getHistory = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const history = await onboardingService.getOnboardingHistory(companyCode);

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    return handleError(res, error, "Unable to fetch onboarding history.");
  }
};

const stampInvitationEmail = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeId = req.body?.employeeId;
    const success = await onboardingService.markInvitationEmailSent(
      companyCode,
      employeeId
    );
    return res.status(200).json({ success });
  } catch (error) {
    return handleError(res, error, "Unable to stamp invitation email.");
  }
};

const stampApprovalEmail = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const employeeId = req.body?.employeeId;
    const success = await onboardingService.markApprovalEmailSent(
      companyCode,
      employeeId
    );
    return res.status(200).json({ success });
  } catch (error) {
    return handleError(res, error, "Unable to stamp approval email.");
  }
};

const getIdentityIndex = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const index = await onboardingService.getIdentityIndex(companyCode);
    return res.status(200).json({
      success: true,
      ...index,
    });
  } catch (error) {
    return handleError(res, error, "Unable to fetch identity index.");
  }
};

module.exports = {
  getPublicRequest,
  submitPublicForm,
  getRequests,
  getRequestById,
  createSingle,
  createBulk,
  approveSingle,
  approveBatch,
  rejectSingle,
  rejectBatch,
  getHistory,
  stampInvitationEmail,
  stampApprovalEmail,
  getIdentityIndex,
};
