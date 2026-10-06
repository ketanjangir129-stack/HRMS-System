const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = Object.freeze([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);
const DEFAULT_TIMEZONE = "Asia/Kolkata";

const getTimeZone = (settings = {}) => {
  const candidate = String(settings.timezone || DEFAULT_TIMEZONE);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const getDateKey = (timestamp = Date.now(), timezone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimeZone({ timezone }),
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseDateKey = (value) => {
  const key = String(value || "");
  if (!DATE_KEY_PATTERN.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day, key }
    : null;
};

const getMonthPath = (dateKey) => {
  const date = parseDateKey(dateKey);
  return date ? `${date.year}/${MONTHS[date.month - 1]}` : "";
};

const formatTime = (timestamp, timezone = DEFAULT_TIMEZONE) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: getTimeZone({ timezone }), hour: "2-digit", minute: "2-digit",
  }).format(new Date(timestamp));

const isFutureDate = (dateKey, timezone = DEFAULT_TIMEZONE, now = Date.now()) => {
  const date = parseDateKey(dateKey);
  return Boolean(date && dateKey > getDateKey(now, timezone));
};

module.exports = {
  DEFAULT_TIMEZONE,
  getDateKey,
  parseDateKey,
  getMonthPath,
  formatTime,
  isFutureDate,
};
