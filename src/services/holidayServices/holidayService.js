import { db } from "../../firebase/firebase";
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
} from "firebase/database";
import {
  getDateKey,
  parseDateKey,
} from "../../utils/attendance/attendanceDate";
import {
  HOLIDAY_NAME_MAX,
  HOLIDAY_NAME_MIN,
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_TYPE_OPTIONS,
  UPCOMING_HOLIDAY_LIMIT,
} from "../../utils/holiday/holidayConstants";
import { getHolidayYear } from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holiday Service
|--------------------------------------------------------------------------
| The only place that talks to the holiday branch of the database.
|
| companies/{companyCode}/holidays/{year}/{holidayId}
|
| Holidays are filed under the year they fall in, so a dashboard only ever
| downloads the year it is showing instead of the whole history. The year is
| never stored on the record: it is the node the record lives in, and deriving
| it from the date is the only way the two can never disagree.
|
| Every write goes through `validateHolidayInput` first and then through the
| duplicate check, because a second holiday on the same date would be counted
| twice by the attendance and leave modules that read this tree.
|--------------------------------------------------------------------------
*/

const holidaysPath = (companyCode) =>
  `companies/${companyCode}/holidays`;

const yearPath = (companyCode, year) =>
  `${holidaysPath(companyCode)}/${year}`;

const holidayPath = (companyCode, year, holidayId) =>
  `${yearPath(companyCode, year)}/${holidayId}`;

/*
| Push keys are generated from the timestamp plus a random component, so two
| people adding a holiday in the same millisecond cannot end up with the same
| id. Prefixed the same way leave requests are, so an id says what it is.
*/

const generateHolidayId = (companyCode) => {

  const key = push(
    ref(
      db,
      holidaysPath(companyCode)
    )
  ).key;

  return `HOL_${key}`;

};

/*
|--------------------------------------------------------------------------
| Firebase Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in a toast. The known ones are translated and
| anything else falls back to the message the caller supplied.
*/

const describeError = (error, fallback) => {

  const code = String(
    error?.code || error?.message || ""
  ).toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to manage holidays.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(
    describeError(error, fallback)
  );

};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns the first problem as a message, or null when the holiday is valid.
|
| The date is checked by rebuilding it: `2026-02-31` parses into the 3rd of
| March, so a date that does not come back as it went in never existed.
*/

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const validateHolidayInput = (holiday = {}) => {

  const name = String(holiday.name || "").trim();

  if (!name) {
    return "Holiday name is required.";
  }

  if (name.length < HOLIDAY_NAME_MIN) {
    return `Holiday name should contain at least ${HOLIDAY_NAME_MIN} characters.`;
  }

  if (name.length > HOLIDAY_NAME_MAX) {
    return `Holiday name cannot exceed ${HOLIDAY_NAME_MAX} characters.`;
  }

  const date = String(holiday.date || "").trim();

  if (!date) {
    return "Holiday date is required.";
  }

  const parsed = DATE_PATTERN.test(date)
    ? parseDateKey(date)
    : null;

  if (!parsed || getDateKey(parsed) !== date) {
    return "Please select a valid holiday date.";
  }

  if (!holiday.type) {
    return "Please select a holiday type.";
  }

  if (!HOLIDAY_TYPE_OPTIONS.includes(holiday.type)) {
    return "Please select a valid holiday type.";
  }

  if (
    String(holiday.description || "").trim().length >
    HOLIDAY_DESCRIPTION_MAX
  ) {
    return `Description cannot exceed ${HOLIDAY_DESCRIPTION_MAX} characters.`;
  }

  return null;

};

/*
|--------------------------------------------------------------------------
| Duplicate Check
|--------------------------------------------------------------------------
| Two holidays on the same day would be counted twice by every calculation
| that reads this tree, and two holidays with the same name in one year is
| almost always the same holiday entered twice.
|
| `ignoreId` is the record being edited, which must not clash with itself.
| Names are compared case and space insensitively, so "Republic  Day" and
| "republic day" are recognised as the same holiday.
*/

const normalizeName = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const findDuplicate = (
  holidays = {},
  { date, name, ignoreId }
) => {

  const nameKey = normalizeName(name);

  const clash = Object.values(holidays).find((holiday) => {

    if (holiday?.holidayId === ignoreId) return false;

    return (
      holiday?.date === date ||
      normalizeName(holiday?.name) === nameKey
    );

  });

  if (!clash) return null;

  return clash.date === date
    ? `A holiday is already recorded on ${date}: ${clash.name}.`
    : `A holiday named "${clash.name}" already exists in ${getHolidayYear(clash.date)}.`;

};

/*
|--------------------------------------------------------------------------
| Record
|--------------------------------------------------------------------------
| Firebase rejects `undefined`, so every field is written explicitly.
*/

const buildHolidayRecord = ({
  holidayId,
  name,
  date,
  type,
  description = "",
  isOptional = false,
  createdBy = "",
  createdAt,
}) => ({

  holidayId,

  name: String(name).trim(),

  date,

  type,

  description: String(description || "").trim(),

  isOptional: Boolean(isOptional),

  createdBy: createdBy || "",

  createdAt: createdAt || Date.now(),

  updatedAt: Date.now(),

});

/*
|--------------------------------------------------------------------------
| Create Holiday
|--------------------------------------------------------------------------
*/

export const createHoliday = async (
  companyCode,
  holiday
) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const error = validateHolidayInput(holiday);

    if (error) {
      return {
        success: false,
        message: error,
      };
    }

    const date = String(holiday.date).trim();

    const year = getHolidayYear(date);

    const snapshot = await get(
      ref(db, yearPath(companyCode, year))
    );

    const duplicate = findDuplicate(
      snapshot.exists() ? snapshot.val() : {},
      { date, name: holiday.name }
    );

    if (duplicate) {
      return {
        success: false,
        message: duplicate,
      };
    }

    const holidayId = generateHolidayId(companyCode);

    await set(
      ref(db, holidayPath(companyCode, year, holidayId)),
      buildHolidayRecord({
        ...holiday,
        holidayId,
        date,
      })
    );

    return {
      success: true,
      holidayId,
      year,
    };

  } catch (error) {

    throw failWith(
      error,
      "Create Holiday Error",
      "Failed to create holiday."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Get Holiday
|--------------------------------------------------------------------------
*/

export const getHoliday = async (
  companyCode,
  year,
  holidayId
) => {

  try {

    if (!companyCode || !year || !holidayId) {
      return null;
    }

    const snapshot = await get(
      ref(db, holidayPath(companyCode, year, holidayId))
    );

    return snapshot.exists() ? snapshot.val() : null;

  } catch (error) {

    throw failWith(
      error,
      "Get Holiday Error",
      "Failed to load holiday."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Get Holidays
|--------------------------------------------------------------------------
| Every holiday of one year, as a plain array. Ordering and grouping are left
| to the holiday utilities so the same fetch serves the table, the calendar
| and the upcoming list.
*/

export const getHolidays = async (
  companyCode,
  year
) => {

  try {

    if (!companyCode || !year) {
      return [];
    }

    const snapshot = await get(
      ref(db, yearPath(companyCode, year))
    );

    if (!snapshot.exists()) {
      return [];
    }

    return Object.values(snapshot.val());

  } catch (error) {

    throw failWith(
      error,
      "Get Holidays Error",
      "Failed to load holidays."
    );

  }

};

/*
| The holidays of several years at once, flattened into one list.
|
| A leave range and a payroll month can both straddle a new year, and the
| callers that do should not have to fire the reads themselves.
*/

export const getHolidaysForYears = async (
  companyCode,
  years = []
) => {

  const unique = [
    ...new Set(
      years
        .map(Number)
        .filter((year) => Boolean(year))
    ),
  ];

  if (!companyCode || unique.length === 0) {
    return [];
  }

  const lists = await Promise.all(
    unique.map((year) => getHolidays(companyCode, year))
  );

  return lists.flat();

};

/*
|--------------------------------------------------------------------------
| Update Holiday
|--------------------------------------------------------------------------
| `currentYear` is the year the record lives under today, which is not always
| the year it is being moved to: editing the date of a holiday from the 31st
| of December to the 1st of January changes the node it belongs in.
|
| A move is written as a create in the new year followed by a remove from the
| old one. Doing it in that order means a failure leaves the holiday readable
| in both years rather than in neither, and re-saving repairs it.
*/

export const updateHoliday = async (
  companyCode,
  currentYear,
  holidayId,
  updates
) => {

  try {

    if (!companyCode || !currentYear || !holidayId) {
      return {
        success: false,
        message: "Holiday not found.",
      };
    }

    const error = validateHolidayInput(updates);

    if (error) {
      return {
        success: false,
        message: error,
      };
    }

    const currentRef = ref(
      db,
      holidayPath(companyCode, currentYear, holidayId)
    );

    const snapshot = await get(currentRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: "This holiday no longer exists.",
      };
    }

    const existing = snapshot.val();

    const date = String(updates.date).trim();

    const year = getHolidayYear(date);

    const yearSnapshot = await get(
      ref(db, yearPath(companyCode, year))
    );

    const duplicate = findDuplicate(
      yearSnapshot.exists() ? yearSnapshot.val() : {},
      {
        date,
        name: updates.name,
        ignoreId: holidayId,
      }
    );

    if (duplicate) {
      return {
        success: false,
        message: duplicate,
      };
    }

    const record = buildHolidayRecord({
      ...existing,
      ...updates,
      holidayId,
      date,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
    });

    if (Number(year) === Number(currentYear)) {

      await update(currentRef, record);

      return {
        success: true,
        year,
      };

    }

    await set(
      ref(db, holidayPath(companyCode, year, holidayId)),
      record
    );

    await remove(currentRef);

    return {
      success: true,
      year,
      moved: true,
    };

  } catch (error) {

    throw failWith(
      error,
      "Update Holiday Error",
      "Failed to update holiday."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Delete Holiday
|--------------------------------------------------------------------------
*/

export const deleteHoliday = async (
  companyCode,
  year,
  holidayId
) => {

  try {

    if (!companyCode || !year || !holidayId) {
      return {
        success: false,
        message: "Holiday not found.",
      };
    }

    const holidayRef = ref(
      db,
      holidayPath(companyCode, year, holidayId)
    );

    const snapshot = await get(holidayRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: "This holiday no longer exists.",
      };
    }

    await remove(holidayRef);

    return {
      success: true,
    };

  } catch (error) {

    throw failWith(
      error,
      "Delete Holiday Error",
      "Failed to delete holiday."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Get Holiday By Date
|--------------------------------------------------------------------------
| The year is derived from the date, so a single day is answered by reading
| one year node instead of the whole tree.
*/

export const getHolidayByDate = async (
  companyCode,
  date
) => {

  try {

    const year = getHolidayYear(date);

    if (!companyCode || !year) {
      return null;
    }

    const holidays = await getHolidays(companyCode, year);

    return (
      holidays.find((holiday) => holiday?.date === date) || null
    );

  } catch (error) {

    throw failWith(
      error,
      "Get Holiday By Date Error",
      "Failed to load holiday."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Upcoming Holidays
|--------------------------------------------------------------------------
| The next holidays from a given day onwards, nearest first.
|
| Late in December the current year has nothing left to show, so the next
| year is read as well and only when the current one cannot fill the list.
*/

export const getUpcomingHolidays = async (
  companyCode,
  {
    from = getDateKey(),
    limit = UPCOMING_HOLIDAY_LIMIT,
  } = {}
) => {

  try {

    const year = getHolidayYear(from);

    if (!companyCode || !year) {
      return [];
    }

    const upcoming = (await getHolidays(companyCode, year))
      .filter((holiday) => holiday?.date >= from);

    if (upcoming.length < limit) {

      const next = await getHolidays(
        companyCode,
        year + 1
      );

      upcoming.push(...next);

    }

    return upcoming
      .sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      )
      .slice(0, limit);

  } catch (error) {

    throw failWith(
      error,
      "Get Upcoming Holidays Error",
      "Failed to load upcoming holidays."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Is Holiday
|--------------------------------------------------------------------------
| Whether a single `YYYY-MM-DD` day is a declared holiday.
|
| Only for one off checks: anything that walks a month or a leave range reads
| the year once with `getHolidays` and asks the holiday utilities instead, so
| a report does not fire one read per day.
*/

export const isHoliday = async (
  companyCode,
  date
) => {

  const holiday = await getHolidayByDate(companyCode, date);

  return Boolean(holiday);

};
