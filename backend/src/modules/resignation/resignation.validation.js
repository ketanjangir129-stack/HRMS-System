/**
 * Validate resignation creation data
 */
const validateCreateResignation = ({
  reasonCategory,
  reason,
  lastWorkingDay,
  noticePeriodDays,
}) => {
  const errors = {};

  if (!String(reasonCategory || "").trim()) {
    errors.reasonCategory =
      "Reason category is required.";
  }

  if (!String(reason || "").trim()) {
    errors.reason =
      "Reason is required.";
  }

  if (!lastWorkingDay) {
    errors.lastWorkingDay =
      "Expected last working day is required.";
  }

  const noticePeriod = Number(noticePeriodDays);

  if (
    noticePeriodDays === undefined ||
    noticePeriodDays === null ||
    Number.isNaN(noticePeriod) ||
    noticePeriod < 0
  ) {
    errors.noticePeriodDays =
      "Valid notice period is required.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error(
      "Invalid resignation data."
    );

    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.errors = errors;

    throw error;
  }

  return true;
};


/**
 * Validate rejection reason
 */
const validateRejection = (reason) => {
  if (!String(reason || "").trim()) {
    const error = new Error(
      "A reason is required to reject a resignation."
    );

    error.statusCode = 400;
    error.code = "REJECTION_REASON_REQUIRED";

    throw error;
  }

  return true;
};


/**
 * Validate last working day
 */
const validateLastWorkingDay = (
  lastWorkingDay
) => {
  if (!lastWorkingDay) {
    const error = new Error(
      "Confirm the last working day before approving."
    );

    error.statusCode = 400;
    error.code = "LAST_WORKING_DAY_REQUIRED";

    throw error;
  }

  return true;
};


/**
 * Validate F&F data
 */
const validateFnf = (fnf) => {
  if (
    !fnf ||
    typeof fnf !== "object" ||
    Array.isArray(fnf)
  ) {
    const error = new Error(
      "F&F data is required."
    );

    error.statusCode = 400;
    error.code = "FNF_REQUIRED";

    throw error;
  }

  if (
    !fnf.values ||
    typeof fnf.values !== "object" ||
    Array.isArray(fnf.values) ||
    Object.keys(fnf.values).length === 0
  ) {
    const error = new Error(
      "F&F values are required."
    );

    error.statusCode = 400;
    error.code = "FNF_VALUES_REQUIRED";

    throw error;
  }

  return true;
};


module.exports = {
  validateLastWorkingDay,
  validateCreateResignation,
  validateRejection,
  validateFnf,
};