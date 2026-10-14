const statutoryComplianceService = require("../services/statutorycomplianceService");

const sendResult = (res, result, fallbackStatus = 200) => {
  const { status, ...payload } = result || {};
  return res.status(status || fallbackStatus).json(payload);
};

const handleError = (res, error, fallbackMessage) => {
  console.error("Statutory compliance controller error:", error);

  if (error.code === "VALIDATION_FAILED") {
    return res.status(422).json({
      success: false,
      code: error.code,
      message: error.message,
      errors: error.errors || {},
    });
  }

  const status = Number(error.statusCode) || 500;

  return res.status(status).json({
    success: false,
    code: error.code || (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message:
      status < 500 ? error.message : fallbackMessage || "An unexpected error occurred.",
  });
};

// GET /api/statutory-compliance
const getPolicy = async (req, res) => {
  try {
    const policy = await statutoryComplianceService.getPolicy(req.user.companyCode);

    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    return handleError(res, error, "Failed to load statutory compliance policies.");
  }
};

// PUT /api/statutory-compliance/:key — pf | esi | professional-tax | income-tax
const updatePolicy = async (req, res) => {
  try {
    const KEY_ALIASES = {
      pf: "pf",
      esi: "esi",
      "professional-tax": "professionalTax",
      professionalTax: "professionalTax",
      "income-tax": "incomeTax",
      incomeTax: "incomeTax",
    };

    const key = KEY_ALIASES[req.params.key] || req.params.key;
    const result = await statutoryComplianceService.updatePolicy(
      req.user.companyCode,
      key,
      req.body?.draft ?? req.body
    );

    return sendResult(
      res,
      {
        success: true,
        message: `${result.label} policy saved.`,
        data: { [result.key]: result.policy },
        policy: result.policy,
      },
      200
    );
  } catch (error) {
    return handleError(res, error, "Failed to save the policy. Please try again.");
  }
};

// POST /api/statutory-compliance/calculate — { earnings, policy? }
const calculate = async (req, res) => {
  try {
    const result = await statutoryComplianceService.calculateForCompany(
      req.user.companyCode,
      { earnings: req.body?.earnings, policy: req.body?.policy }
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to calculate statutory deductions.");
  }
};

module.exports = {
  getPolicy,
  updatePolicy,
  calculate,
};
