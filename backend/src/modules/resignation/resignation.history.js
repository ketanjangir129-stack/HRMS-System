const repository = require("./resignation.repository");

const buildHistoryEntry = ({
  action,
  fromStatus,
  toStatus,
  actor,
  remarks = "",
  metadata = {},
  performedAt,
}) => {
  const historyId = repository.generateHistoryId();

  return {
    historyId,

    action,

    fromStatus: fromStatus || null,

    toStatus: toStatus || null,

    performedBy:
      actor?.employeeId ||
      actor?.uid ||
      "",

    performedByName:
      actor?.name ||
      actor?.employeeId ||
      "",

    performedAt: performedAt || Date.now(),

    remarks: remarks || "",

    metadata: metadata || {},
  };
};

const getHistory = async ({
  companyCode,
  resignationId,
}) => {
  const resignation = await repository.findById(
    companyCode,
    resignationId
  );

  if (!resignation) {
    throw new Error("Resignation not found");
  }

  const history = resignation.history || {};

  return Object.values(history).sort(
    (a, b) => a.performedAt - b.performedAt
  );
};

module.exports = {
  buildHistoryEntry,
  getHistory,
};