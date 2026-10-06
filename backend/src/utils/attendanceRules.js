const DEFAULT_WORK_RULES = Object.freeze({
  startTime: "09:30",
  endTime: "18:30",
  gracePeriodMinutes: 15,
});
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeMinutes = (value, fallback) => {
  const match = TIME_PATTERN.exec(String(value || ""));
  if (!match) {
    const [hours, minutes] = fallback.split(":").map(Number);
    return hours * 60 + minutes;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

const normalizeWorkRules = (stored = {}) => {
  const startTime = TIME_PATTERN.test(String(stored.startTime || "")) ? stored.startTime : DEFAULT_WORK_RULES.startTime;
  const endTime = TIME_PATTERN.test(String(stored.endTime || "")) ? stored.endTime : DEFAULT_WORK_RULES.endTime;
  const start = timeMinutes(startTime, DEFAULT_WORK_RULES.startTime);
  const end = timeMinutes(endTime, DEFAULT_WORK_RULES.endTime);
  const grace = Number(stored.gracePeriodMinutes);
  return {
    startTime: end > start ? startTime : DEFAULT_WORK_RULES.startTime,
    endTime: end > start ? endTime : DEFAULT_WORK_RULES.endTime,
    gracePeriodMinutes: Number.isFinite(grace) && grace >= 0
      ? Math.min(Math.floor(grace), 240)
      : DEFAULT_WORK_RULES.gracePeriodMinutes,
  };
};

const formatWorkingMinutes = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const calculateWorkingHours = (punchIn, punchOut) => {
  if (!punchIn || !punchOut) return "";
  const diff = Number(punchOut) - Number(punchIn);
  return diff > 0 ? formatWorkingMinutes(Math.floor(diff / 60000)) : "";
};

const resolvePunchInStatus = (timestamp, settings = {}) => {
  const rules = normalizeWorkRules(settings);
  const start = timeMinutes(rules.startTime, DEFAULT_WORK_RULES.startTime);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timezone || "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return minutes > start + rules.gracePeriodMinutes ? "Late" : "Present";
};

const getApprovalStatus = (record) => record?.approvalStatus || "Approved";

const makeApproval = ({ status = "Pending", by = "", remarks = "", at = Date.now() } = {}) => ({
  approvalStatus: status,
  approvedBy: status === "Pending" ? "" : by,
  approvedAt: status === "Pending" ? null : at,
  approvalRemarks: remarks,
});

const parsePunchTime = (value, field, { optional = true } = {}) => {
  if (value === null || value === undefined || value === "") {
    if (optional) return null;
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    error.code = "INVALID_PUNCH_TIME";
    throw error;
  }
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now() + 60_000) {
    const error = new Error(`${field} must be a valid timestamp.`);
    error.statusCode = 400;
    error.code = "INVALID_PUNCH_TIME";
    throw error;
  }
  return timestamp;
};

module.exports = {
  DEFAULT_WORK_RULES,
  normalizeWorkRules,
  calculateWorkingHours,
  resolvePunchInStatus,
  getApprovalStatus,
  makeApproval,
  parsePunchTime,
};
