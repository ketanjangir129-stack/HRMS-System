const db = require("../../config/firebase");
const { normalizeStatus } = require("./resignation.constants");

const withNormalizedStatus = (resignationId, record) => ({
  resignationId,
  ...record,
  status: normalizeStatus(record?.status),
});

const getResignationsPath = (companyCode) =>
  `companies/${companyCode}/resignations`;

const getResignationPath = (companyCode, resignationId) =>
  `${getResignationsPath(companyCode)}/${resignationId}`;

/**
 * Generate a unique resignation ID
 */
const generateResignationId = (companyCode) => {
  const key = db
    .ref(getResignationsPath(companyCode))
    .push()
    .key;

  if (!key) {
    const error = new Error("Unable to generate resignation ID.");
    error.code = "RESIGNATION_ID_GENERATION_FAILED";
    throw error;
  }

  return `RES_${key}`;
};

/**
 * Get all resignations for a company
 */
const findAll = async (companyCode) => {
  const snapshot = await db
    .ref(getResignationsPath(companyCode))
    .once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};

  return Object.entries(data).map(([resignationId, record]) =>
    withNormalizedStatus(resignationId, record)
  );
};

/**
 * Get resignation by ID
 */
const findById = async (companyCode, resignationId) => {
  const snapshot = await db
    .ref(getResignationPath(companyCode, resignationId))
    .once("value");

  if (!snapshot.exists()) {
    return null;
  }

  return withNormalizedStatus(resignationId, snapshot.val());
};

/**
 * Create resignation
 */
const create = async (
  companyCode,
  resignationId,
  resignation
) => {
  await db
    .ref(getResignationPath(companyCode, resignationId))
    .set(resignation);

  return {
    resignationId,
    ...resignation,
  };
};

/**
 * Update resignation
 */
const update = async (
  companyCode,
  resignationId,
  updates
) => {
  await db
    .ref(getResignationPath(companyCode, resignationId))
    .update(updates);

  return findById(companyCode, resignationId);
};

/**
 * Delete resignation
 */
const remove = async (
  companyCode,
  resignationId
) => {
  await db
    .ref(getResignationPath(companyCode, resignationId))
    .remove();

  return true;
};

module.exports = {
  db,
  getResignationsPath,
  getResignationPath,
  generateResignationId,
  findAll,
  findById,
  create,
  update,
  remove,
};