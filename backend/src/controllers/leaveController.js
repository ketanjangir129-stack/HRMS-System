const leaveService = require("../services/leaveService");

const sendResult = (res, result, fallbackStatus = 200) => {
  const { status, ...payload } = result || {};

  return res.status(status || fallbackStatus).json(payload);
};

const handleError = (res, error, fallbackMessage) => {
  console.error("Leave controller error:", error);

  const status = Number(error.statusCode) || 500;

  return res.status(status).json({
    success: false,
    code:
      error.code ||
      (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message:
      status < 500
        ? error.message
        : fallbackMessage || "An unexpected error occurred.",
  });
};

const getLeaveRequests = async (req, res) => {
  try {
    const requests = await leaveService.getLeaveRequests(
      req.user.companyCode,
      req.user
    );

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch leave requests.");
  }
};

const createLeaveRequest = async (req, res) => {
  try {
    const result = await leaveService.createLeaveRequest({
      companyCode: req.user.companyCode,
      user: req.user,
      payload: req.body,
    });

    return sendResult(res, result, 201);
  } catch (error) {
    return handleError(res, error, "Failed to create leave request.");
  }
};

const updateLeaveRequest = async (req, res) => {
  try {
    const result = await leaveService.updateLeaveRequest({
      companyCode: req.user.companyCode,
      user: req.user,
      requestId: req.params.requestId,
      payload: req.body,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to update leave request.");
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    const result = await leaveService.deleteLeaveRequest({
      companyCode: req.user.companyCode,
      user: req.user,
      requestId: req.params.requestId,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to delete leave request.");
  }
};

const approveLeaveRequest = async (req, res) => {
  try {
    const result = await leaveService.approveLeaveRequest({
      companyCode: req.user.companyCode,
      user: req.user,
      requestId: req.params.requestId,
      payload: req.body,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to approve leave request.");
  }
};

const rejectLeaveRequest = async (req, res) => {
  try {
    const result = await leaveService.rejectLeaveRequest({
      companyCode: req.user.companyCode,
      user: req.user,
      requestId: req.params.requestId,
      payload: req.body,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to reject leave request.");
  }
};

// const getLeaveSettings = async (req, res) => {
//   try {
//     const result = await leaveService.getLeaveSettings({
//       companyCode: req.user.companyCode,
//       user: req.user,
//     });

//     return sendResult(res, result);
//   } catch (error) {
//     return handleError(res, error, "Failed to fetch leave settings.");
//   }
// };
const getLeaveSettings = async (req, res) => {
  try {
    const settings = await leaveService.getSettings(
      req.user.companyCode
    );

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch leave settings.");
  }
};

const updateLeaveSettings = async (req, res) => {
  try {
    const result = await leaveService.updateLeaveSettings({
      companyCode: req.user.companyCode,
      user: req.user,
      payload: req.body,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to update leave settings.");
  }
};

const getLeaveUsage = async (req, res) => {
  try {
    const result = await leaveService.getLeaveUsage({
      companyCode: req.user.companyCode,
      user: req.user,
      year: req.params.year,
      employeeId: req.params.employeeId || req.user.employeeId,
    });

    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch leave usage.");
  }
};

module.exports = {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveSettings,
  updateLeaveSettings,
  getLeaveUsage,
};
