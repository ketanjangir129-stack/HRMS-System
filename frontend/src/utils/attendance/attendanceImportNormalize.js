import * as XLSX from "xlsx";

import { getDateKey, parseDateKey } from "./attendanceDate";
import {
  DATE_FORMAT,
  IMPORT_FIELDS,
  STATUS_ALIAS_MAP,
} from "./attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Attendance Import - Normalisation
|--------------------------------------------------------------------------
| Turning what a file says into what the attendance module stores.
|
| Every function here is pure and every one of them can fail out loud. That is
| the point: an importer that quietly turns something it did not understand
| into a plausible value is how a migration ends up looking successful and
| being wrong. A value that cannot be read comes back marked, and the row it
| came from is stopped at validation rather than written.
|
| The date key produced here is the same `YYYY-MM-DD` local key the rest of the
| module is built on, and it is produced without `toISOString` anywhere near
| it - see `attendanceDate`, which explains why at length. Attendance is a
| calendar day, not an instant, and the arithmetic below never leaves the
| calendar.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Column Auto-Detection
|--------------------------------------------------------------------------
| A first guess at which column is which, from the heading names.
|
| It is only ever a guess. The mapping step renders every field as a picker
| with the guess pre-selected, so the user confirms or corrects it before a
| single cell is read through it - which is what stops a column called "Status"
| that actually holds a shift code from being imported as an attendance status.
|
| Matched in two passes so a strong match always beats a weak one regardless of
| column order: an exact alias first across every column, and only then a
| contains match for the columns still unclaimed. Without the two passes a
| sheet with both "Time In" and "In" could bind "In" to Punch In simply by
| appearing first.
*/

export const autoDetectMapping = (headers = []) => {

  const mapping = {};

  const claimed = new Set();

  const usable = headers.filter((header) => !header.blank);

  IMPORT_FIELDS.forEach((field) => {

    const exact = usable.find(
      (header) =>
        !claimed.has(header.index) &&
        field.aliases.includes(header.key)
    );

    if (exact) {
      mapping[field.key] = exact.index;
      claimed.add(exact.index);
    }

  });

  IMPORT_FIELDS.forEach((field) => {

    if (mapping[field.key] !== undefined) return;

    /*
    | Longest alias first, so "punchintime" is tried before "in" and a column
    | called "Punch In Time" is not claimed by the shortest alias that happens
    | to be a substring of it.
    */
    const aliases = [...field.aliases].sort((a, b) => b.length - a.length);

    const partial = usable.find(
      (header) =>
        !claimed.has(header.index) &&
        header.key.length > 2 &&
        aliases.some(
          (alias) =>
            alias.length > 2 &&
            (header.key.includes(alias) || alias.includes(header.key))
        )
    );

    if (partial) {
      mapping[field.key] = partial.index;
      claimed.add(partial.index);
    }

  });

  return mapping;

};

/*
|--------------------------------------------------------------------------
| Dates
|--------------------------------------------------------------------------
*/

const pad = (value) => String(value).padStart(2, "0");

const toDateKey = (year, month, day) =>
  `${year}-${pad(month)}-${pad(day)}`;

/*
| Whether a year, month and day describe a day that exists.
|
| Checked by rebuilding it rather than by range checking the parts, because
| `2026-02-31` passes every range check and is the 3rd of March. A date that
| does not come back as it went in never existed.
*/

const isRealDate = (year, month, day) => {

  if (!year || !month || !day) return false;

  if (year < 1900 || year > 2200) return false;

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );

};

const DATE_PATTERNS = {
  // 2024-08-15, 2024/08/15
  yearFirst: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
  // 15-08-2024, 08/15/2024 - which of the two it is depends on the format
  yearLast: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/,
};

/*
| A single cell turned into a `YYYY-MM-DD` key.
|
| Returns `{ date, ambiguous, error }`. Exactly one of the three is ever
| meaningful: a date that was read, a date that could be two different days, or
| a reason it could not be read at all.
|
| `format` is the user's answer from the mapping step. Under AUTO the two digit
| shapes are only accepted when they can only mean one thing - a part above
| twelve cannot be a month - and everything else comes back ambiguous rather
| than guessed.
*/

export const normalizeImportDate = (value, format = DATE_FORMAT.AUTO) => {

  /*
  | A spreadsheet date cell arrives as a serial number counting days. Read as a
  | number rather than converted to a `Date` first: `parse_date_code` hands back
  | the calendar parts directly, so the day in the file is the day stored, with
  | no instant and no timezone in between.
  */
  if (typeof value === "number" && Number.isFinite(value)) {

    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed && isRealDate(parsed.y, parsed.m, parsed.d)) {
      return { date: toDateKey(parsed.y, parsed.m, parsed.d) };
    }

    return { error: "Date is not a valid calendar date." };

  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: getDateKey(value) };
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return { error: "Date is missing." };
  }

  const yearFirst = text.match(DATE_PATTERNS.yearFirst);

  if (yearFirst) {

    const year = Number(yearFirst[1]);
    const month = Number(yearFirst[2]);
    const day = Number(yearFirst[3]);

    if (!isRealDate(year, month, day)) {
      return { error: `"${text}" is not a real calendar date.` };
    }

    return { date: toDateKey(year, month, day) };

  }

  const yearLast = text.match(DATE_PATTERNS.yearLast);

  if (yearLast) {

    const first = Number(yearLast[1]);
    const second = Number(yearLast[2]);
    const year = Number(yearLast[3]);

    /*
    | An explicit format is an instruction, so it is followed even when the
    | result is not a real date - the row is then rejected as an impossible
    | date, which is the truth, rather than silently read the other way round.
    */

    if (format === DATE_FORMAT.DMY) {
      return isRealDate(year, second, first)
        ? { date: toDateKey(year, second, first) }
        : { error: `"${text}" is not a real calendar date when read day first.` };
    }

    if (format === DATE_FORMAT.MDY) {
      return isRealDate(year, first, second)
        ? { date: toDateKey(year, first, second) }
        : { error: `"${text}" is not a real calendar date when read month first.` };
    }

    /*
    | AUTO. A part above twelve cannot be a month, which settles most files on
    | their own - and settles them per row, so a file whose dates are all day
    | first is read correctly as soon as one of its days is the 13th or later.
    */

    const firstCanBeMonth = first >= 1 && first <= 12;

    const secondCanBeMonth = second >= 1 && second <= 12;

    if (firstCanBeMonth && secondCanBeMonth) {
      return {
        ambiguous: true,
        error: `"${text}" could be two different dates. Choose a date format.`,
      };
    }

    if (!firstCanBeMonth && secondCanBeMonth) {
      return isRealDate(year, second, first)
        ? { date: toDateKey(year, second, first) }
        : { error: `"${text}" is not a real calendar date.` };
    }

    if (firstCanBeMonth && !secondCanBeMonth) {
      return isRealDate(year, first, second)
        ? { date: toDateKey(year, first, second) }
        : { error: `"${text}" is not a real calendar date.` };
    }

    return { error: `"${text}" is not a real calendar date.` };

  }

  return {
    error: `"${text}" is not a date the importer recognises.`,
  };

};

/*
| Whether a column of raw date cells contains anything that cannot be settled
| without being told the format.
|
| Run over the whole file once before validation, so the date format picker is
| offered when it is genuinely needed and stays out of the way when it is not.
| Stops at the first ambiguous cell: one is enough to have to ask.
*/

export const detectDateAmbiguity = (values = []) => {

  for (let index = 0; index < values.length; index += 1) {

    const result = normalizeImportDate(values[index], DATE_FORMAT.AUTO);

    if (result.ambiguous) {
      return { ambiguous: true, sample: String(values[index] ?? "") };
    }

  }

  return { ambiguous: false, sample: "" };

};

/*
|--------------------------------------------------------------------------
| Times
|--------------------------------------------------------------------------
| A punch time is stored as a millisecond timestamp on the record and as a
| formatted string beside it, so what is needed from the file is the time of
| day - which is then anchored to the row's own date.
|
| Returns `{ minutes, error }`, minutes being minutes past local midnight. An
| empty cell is neither: it comes back as nothing at all, because a missing
| punch out is normal and only the validator knows whether this particular row
| needed one.
*/

const TIME_PATTERN =
  /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i;

export const normalizeImportTime = (value) => {

  /*
  | A spreadsheet time cell is a fraction of a day: 0.5 is noon.
  |
  | At or above 1 it is a full date and time - `45519.3958` is the 15th of
  | August at 09:30 - which is what an Excel export of a punch log very often
  | holds, because the old system stored the instant rather than the time. The
  | whole part is the day the row already carries in its date column, so the
  | fraction is the punch time and the day is dropped.
  |
  | Read through `parse_date_code` rather than by taking the remainder, so the
  | hour comes off the serial the same way the date column's does instead of
  | through floating point arithmetic of our own.
  |
  | A negative serial is not a time at all.
  */
  if (typeof value === "number" && Number.isFinite(value)) {

    if (value < 0) {
      return { error: `"${value}" is not a time of day.` };
    }

    if (value >= 1) {

      const parsed = XLSX.SSF.parse_date_code(value);

      if (!parsed) {
        return { error: `"${value}" is not a time of day.` };
      }

      return { minutes: parsed.H * 60 + parsed.M };

    }

    return {
      minutes: Math.round(value * 24 * 60) % (24 * 60),
    };

  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      minutes: value.getHours() * 60 + value.getMinutes(),
    };
  }

  const text = String(value ?? "").trim();

  if (!text) return {};

  const match = text.match(TIME_PATTERN);

  if (!match) {
    return { error: `"${text}" is not a time the importer recognises.` };
  }

  let hours = Number(match[1]);

  const minutes = match[2] === undefined ? 0 : Number(match[2]);

  const meridiem = match[4]
    ? match[4].toLowerCase().replace(/\./g, "")
    : "";

  if (minutes > 59) {
    return { error: `"${text}" has more than 59 minutes in it.` };
  }

  if (meridiem) {

    if (hours < 1 || hours > 12) {
      return { error: `"${text}" is not a valid 12 hour time.` };
    }

    if (meridiem === "pm" && hours !== 12) hours += 12;

    if (meridiem === "am" && hours === 12) hours = 0;

  } else if (hours > 23) {
    return { error: `"${text}" is not a valid time of day.` };
  }

  return { minutes: hours * 60 + minutes };

};

/*
| Minutes past midnight anchored to a date key, as the millisecond timestamp a
| record stores.
|
| Built from the date's own calendar parts and then given an hour, so the
| timestamp lands at that wall clock time on that day in the browser's own
| timezone - the same way a punch recorded live does.
*/

export const toImportTimestamp = (dateKey, minutes) => {

  if (!dateKey || minutes === undefined || minutes === null) return null;

  const date = parseDateKey(dateKey);

  if (!date) return null;

  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date.getTime();

};

/*
| A time of day rendered back for the preview, in the 24 hour form the file is
| most likely to have used. Only ever shown, never stored.
*/

export const formatImportMinutes = (minutes) => {

  if (minutes === undefined || minutes === null) return "";

  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

};

/*
|--------------------------------------------------------------------------
| Statuses
|--------------------------------------------------------------------------
| A status cell turned into one of ours.
|
| `overrides` are the answers the user gave in the mapping step for the values
| the alias table did not recognise, keyed the same way the table is. They are
| consulted first, so a company whose old system wrote "WFH" decides once what
| that means and every row carrying it follows.
|
| A value that is neither recognised nor mapped comes back unresolved. It is
| never defaulted to Present: a migration that turns every unknown code into a
| day of attendance is a migration that pays people for days nobody can account
| for.
*/

export const toStatusKey = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const normalizeImportStatus = (value, overrides = {}) => {

  const text = String(value ?? "").trim();

  if (!text) return {};

  const key = toStatusKey(text);

  if (!key) return {};

  if (overrides[key]) {
    return { status: overrides[key], mapped: true };
  }

  if (STATUS_ALIAS_MAP[key]) {
    return { status: STATUS_ALIAS_MAP[key] };
  }

  return { unresolved: text };

};

/*
| Every distinct status value in the file that nothing recognises, with how
| many rows carry each, so the mapping step can ask about them once instead of
| the preview reporting the same unknown status ten thousand times.
|
| Keyed by the comparison key and carrying the first spelling seen, so
| "P " and "p" are one question and the user is shown the value as it appears
| in their file.
*/

export const collectUnknownStatuses = (values = [], overrides = {}) => {

  const unknown = new Map();

  values.forEach((value) => {

    const result = normalizeImportStatus(value, overrides);

    if (!result.unresolved) return;

    const key = toStatusKey(result.unresolved);

    const existing = unknown.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    unknown.set(key, {
      key,
      value: result.unresolved,
      count: 1,
    });

  });

  return [...unknown.values()].sort((a, b) => b.count - a.count);

};

/*
|--------------------------------------------------------------------------
| Employee Ids
|--------------------------------------------------------------------------
| Employees are keyed in upper case throughout - `EmployeeService` upper cases
| on write and on every read - so an id from a file is brought to the same
| shape before it is looked up. Without this "emp001" would be reported as an
| employee who does not exist.
*/

export const normalizeEmployeeId = (value) =>
  String(value ?? "").trim().toUpperCase();
