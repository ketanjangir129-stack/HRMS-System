import { MONTHS } from "./attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Date Keys
|--------------------------------------------------------------------------
| Attendance records are stored under a `YYYY-MM-DD` key. That key has to be
| built from local time, not UTC: `toISOString()` converts to UTC first, so in
| IST every punch before 05:30 would be filed under the previous day and then
| disappear from "today".
|--------------------------------------------------------------------------
*/

export const getDateKey = (value = new Date()) => {

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;

};

/*
| The `YYYY-MM` prefix used to select a single month out of the records tree.
*/

export const getMonthPrefix = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

/*
| A `YYYY-MM-DD` key parsed back into a local Date. `new Date("2026-08-05")` is
| parsed as UTC midnight, which lands on the previous day in negative offsets
| and shifts the calendar highlight by a day.
*/

export const parseDateKey = (dateKey) => {

  const [year, month, day] = String(dateKey)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);

};

/*
| Every date key of a month, used to build day by day reports.
*/

export const getMonthDateKeys = (year, month) => {

  const days = new Date(year, month, 0).getDate();

  return Array.from({ length: days }, (_, index) =>
    getDateKey(new Date(year, month - 1, index + 1))
  );

};

export const getMonthLabel = (year, month) =>
  `${MONTHS[month - 1]} ${year}`;

/*
| Moves a { year, month } pair one month forwards or backwards.
*/

export const shiftMonth = (year, month, direction) => {

  const offset = direction === "next" ? 1 : -1;

  const next = new Date(year, month - 1 + offset, 1);

  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
  };

};

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

export const formatDate = (value) => {

  if (!value) return "--";

  const date =
    typeof value === "string"
      ? parseDateKey(value) || new Date(value)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

};

export const formatDayLabel = (value) => {

  if (!value) return "--";

  const date =
    typeof value === "string"
      ? parseDateKey(value) || new Date(value)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

};

export const formatTime = (timestamp) => {

  if (!timestamp) return "--";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

};

export const formatDateTime = (timestamp) => {

  if (!timestamp) return "--";

  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

};

/*
|--------------------------------------------------------------------------
| Time Inputs
|--------------------------------------------------------------------------
| `<input type="time">` works with "HH:MM" while records store timestamps, so
| both directions are needed.
*/

export const toTimeInputValue = (value) => {

  if (!value) return "";

  // Already a "HH:MM" string.
  if (typeof value === "string" && value.includes(":")) {
    return value.slice(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

};

export const toTimestamp = (dateKey, timeValue) => {

  if (!dateKey || !timeValue) return null;

  const timestamp = new Date(`${dateKey}T${timeValue}`).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;

};

/*
| The latest date a correction request may be raised for.
|
| A day that has not finished cannot be corrected: the punch out has not
| happened yet and the working hours are not final. So the cut off is
| yesterday, which rules out today and every future date at once.
*/

export const getLastCorrectableDate = () => {

  const date = new Date();

  date.setDate(date.getDate() - 1);

  return getDateKey(date);

};
