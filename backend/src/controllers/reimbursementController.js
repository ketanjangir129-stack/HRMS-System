const reimbursementService = require("../services/reimbursementService");

const sendResult = (res, result, fallbackStatus = 200) => {
  const { status, ...payload } = result || {};
  return res.status(status || fallbackStatus).json(payload);
};

const handleError = (res, error, fallbackMessage) => {
  console.error("Reimbursement controller error:", error);
  const status = Number(error.statusCode) || 500;
  return res.status(status).json({
    success: false,
    code: error.code || (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message: status < 500 ? error.message : fallbackMessage || "An unexpected error occurred.",
  });
};

const getClaims = async (req, res) => {
  try {
    const claims = await reimbursementService.listClaims({
      companyCode: req.user.companyCode,
      user: req.user,
    });
    return res.status(200).json({ success: true, claims });
  } catch (error) {
    return handleError(res, error, "Failed to fetch reimbursement claims.");
  }
};

const getClaimById = async (req, res) => {
  try {
    const claim = await reimbursementService.getClaim({
      companyCode: req.user.companyCode,
      user: req.user,
      claimId: req.params.claimId,
    });
    return res.status(200).json({ success: true, claim });
  } catch (error) {
    return handleError(res, error, "Failed to fetch reimbursement claim.");
  }
};

const createClaim = async (req, res) => {
  try {
    const result = await reimbursementService.createClaim({
      companyCode: req.user.companyCode,
      user: req.user,
      payload: req.body,
    });
    return sendResult(res, result, 201);
  } catch (error) {
    return handleError(res, error, "Failed to submit reimbursement claim.");
  }
};

const approveClaim = async (req, res) => {
  try {
    const result = await reimbursementService.approveClaim({
      companyCode: req.user.companyCode,
      user: req.user,
      claimId: req.params.claimId,
      remarks: (req.body || {}).remarks || "",
    });
    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to approve reimbursement claim.");
  }
};

const rejectClaim = async (req, res) => {
  try {
    const result = await reimbursementService.rejectClaim({
      companyCode: req.user.companyCode,
      user: req.user,
      claimId: req.params.claimId,
      reason: (req.body || {}).reason || (req.body || {}).remarks || "",
    });
    return sendResult(res, result);
  } catch (error) {
    return handleError(res, error, "Failed to reject reimbursement claim.");
  }
};

const getSummary = async (req, res) => {
  try {
    const summary = await reimbursementService.getSummary({
      companyCode: req.user.companyCode,
      user: req.user,
    });
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return handleError(res, error, "Failed to fetch reimbursement summary.");
  }
};

module.exports = {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  rejectClaim,
  getSummary,
};
