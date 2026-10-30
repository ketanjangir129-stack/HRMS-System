
import {
  getDateKey,
  parseDateKey,
} from "../../utils/attendance/attendanceDate";

import {
  HOLIDAY_NAME_MAX,
  HOLIDAY_NAME_MIN,
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_MULTIPLE_DATES_MAX,
  HOLIDAY_TYPE_OPTIONS,
  UPCOMING_HOLIDAY_LIMIT,
} from "../../utils/holiday/holidayConstants";

import { getHolidayYear } from "../../utils/holiday/holidayUtils";

import { notifyHolidayAdded } from "../notifications/holidayNotificationService";

import {
  getHolidaysApi,
  getUpcomingHolidaysApi,
  createHolidayApi,
  updateHolidayApi,
  deleteHolidayApi,
  importHolidaysApi,
  uploadHolidayImageApi,
  removeHolidayImageApi,
} from "../api/holidayApi";

/*
|--------------------------------------------------------------------------
| Holiday Service
|--------------------------------------------------------------------------
| Every read and write goes through the backend API. The browser no longer
| listens to the holidays tree in Firebase directly: only the owner signs in
| to Firebase, so for everyone else a direct read either failed or depended
| on the database being readable without a login.
|
| Database structure (owned by the backend):
| companies/{companyCode}/holidays/{year}/{Month}/{holidayId}
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| In-Memory Cache
|--------------------------------------------------------------------------
| Holiday lists by companyCode:year.
|
| - Entries expire after CACHE_TTL_MS, so a holiday added by another admin
|   reaches the attendance and leave pages without a hard refresh.
| - Requests already in flight are shared: two hooks asking for the same
|   year in the same render send one request, not two.
|--------------------------------------------------------------------------
*/

const CACHE_TTL_MS = 5 * 60 * 1000;

const holidayCache = new Map(); // key -> { data, expiresAt }
const inFlight = new Map(); // key -> Promise<list>

const cacheKey = (companyCode, year) => `${companyCode}:${Number(year)}`;

const readCache = (key) => {
  const entry = holidayCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    holidayCache.delete(key);
    return null;
  }
  return entry.data;
};

const writeCache = (key, data) => {
  holidayCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

export const clearHolidayCache = (companyCode, year) => {
  if (companyCode && year) {
    holidayCache.delete(cacheKey(companyCode, year));
  } else if (companyCode) {
    for (const key of holidayCache.keys()) {
      if (key.startsWith(`${companyCode}:`)) {
        holidayCache.delete(key);
      }
    }
  } else {
    holidayCache.clear();
  }
};

/*
|--------------------------------------------------------------------------
| Error Handling
|--------------------------------------------------------------------------
*/

const describeError = (error, fallback) => {
  const code = String(error?.code || error?.message || "").toLowerCase();

  if (
    code.includes("permission_denied") ||
    code.includes("forbidden") ||
    code.includes("unauthorized")
  ) {
    return error?.message || "You do not have permission to manage holidays.";
  }

  if (
    code.includes("network") ||
    code.includes("failed to fetch") ||
    code.includes("unavailable") ||
    code.includes("disconnected")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return error?.message || fallback;
};

const failWith = (error, context, fallback) => {
  console.error(`${context}:`, error);
  return new Error(describeError(error, fallback));
};

const apiFailed = (result) =>
  !result || result.success === false;

const apiErrorMessage = (result, fallback) =>
  result?.message || fallback;

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
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

  const isValidDate = (value) => {
    const parsed = DATE_PATTERN.test(value) ? parseDateKey(value) : null;
    return Boolean(parsed) && getDateKey(parsed) === value;
  };

  if (Array.isArray(holiday.dates)) {
    if (holiday.dates.length === 0) {
      return "Add at least one holiday date.";
    }
    if (holiday.dates.length > HOLIDAY_MULTIPLE_DATES_MAX) {
      return `At most ${HOLIDAY_MULTIPLE_DATES_MAX} dates can be declared at once.`;
    }
    if (!holiday.dates.every((d) => isValidDate(String(d).trim()))) {
      return "One of the selected dates is not valid.";
    }
  }

  const date = String(
    holiday.date || (Array.isArray(holiday.dates) ? holiday.dates[0] : "") || ""
  ).trim();

  if (!date) {
    return "Holiday date is required.";
  }

  if (!isValidDate(date)) {
    return "Please select a valid holiday date.";
  }

  if (holiday.isMultiDay && holiday.endDate) {
    const endDate = String(holiday.endDate).trim();
    const parsedEnd = DATE_PATTERN.test(endDate)
      ? parseDateKey(endDate)
      : null;

    if (!parsedEnd || getDateKey(parsedEnd) !== endDate) {
      return "Please select a valid end date.";
    }

    if (endDate < date) {
      return "End date cannot be earlier than start date.";
    }
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

  if (
    holiday.isOptional !== undefined &&
    typeof holiday.isOptional !== "boolean"
  ) {
    return "Optional holiday status must be true or false.";
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Create Holiday
|--------------------------------------------------------------------------
| The person who declared it is taken from the login on the server; the
| browser does not send a name.
*/

export const createHoliday = async (companyCode, holiday) => {
  if (!companyCode) {
    return {
      success: false,
      message: "Company not found.",
    };
  }

  const validationError = validateHolidayInput(holiday);

  if (validationError) {
    return {
      success: false,
      message: validationError,
    };
  }

  const dates = Array.isArray(holiday.dates)
    ? [...new Set(holiday.dates.map((d) => String(d).trim()))].sort()
    : null;

  const date = dates ? dates[0] : String(holiday.date).trim();

  try {
    const result = await createHolidayApi({
      name: String(holiday.name).trim(),
      date,
      ...(dates ? { dates } : {}),
      ...(!dates && holiday.isMultiDay && holiday.endDate
        ? {
            isMultiDay: true,
            endDate: String(holiday.endDate).trim(),
          }
        : {}),
      type: holiday.type,
      description: String(holiday.description || "").trim(),
      isOptional: Boolean(holiday.isOptional),
    });

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to create holiday."),
      };
    }

    const created = Array.isArray(result.holidays) && result.holidays.length
      ? result.holidays
      : [result.holiday || { ...holiday, date, holidayId: result.holidayId }];

    const first = created[0];
    const last = created[created.length - 1];
    const holidayId = first?.holidayId || result.holidayId;

    // A range can cross into the next year, so every year it touched is
    // dropped from the cache, not just the first.
    const years = Array.isArray(result.years) && result.years.length
      ? result.years
      : [Number(result.year || getHolidayYear(date))];
    years.forEach((y) => clearHolidayCache(companyCode, y));

    /*
    | One announcement per declaration (a five day festival is one message,
    | naming its range), sent in the background: the Save button no longer
    | waits for a write per employee, and a failure cannot undo the create.
    */
    notifyHolidayAdded(
      companyCode,
      {
        ...first,
        name: created.length > 1 ? String(holiday.name).trim() : first?.name,
        // Separate dates are not a range, so only a range names an end date.
        endDate: created.length > 1 && !dates ? last?.date : undefined,
      },
      holidayId
    ).catch((notificationError) => {
      console.error("Holiday notification failed:", notificationError);
    });

    return {
      success: true,
      holidayId,
      holidays: result.holidays,
      count: result.count || 1,
      year: Number(result.year || getHolidayYear(date)),
      years,
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
| Get Holidays For One Year
|--------------------------------------------------------------------------
*/

const fetchYear = (companyCode, year) => {
  const key = cacheKey(companyCode, year);

  if (inFlight.has(key)) return inFlight.get(key);

  const request = getHolidaysApi(year)
    .then((result) => {
      if (apiFailed(result)) {
        throw new Error(
          apiErrorMessage(result, "Failed to load holidays.")
        );
      }

      const list = Array.isArray(result.holidays) ? result.holidays : [];
      writeCache(key, list);
      return list;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
};

export const getHolidays = async (
  companyCode,
  year,
  { force = false } = {}
) => {
  if (!companyCode || !year) {
    return [];
  }

  const key = cacheKey(companyCode, year);

  if (!force) {
    const cached = readCache(key);
    if (cached) return cached;
  } else {
    holidayCache.delete(key);
  }

  try {
    return await fetchYear(companyCode, year);
  } catch (error) {
    throw failWith(
      error,
      "Get Holidays Error",
      "Failed to load holidays."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Holidays Across Multiple Years
|--------------------------------------------------------------------------
| Years already cached or already being fetched are reused; the rest go in
| one consolidated request.
*/

export const getHolidaysForYears = async (
  companyCode,
  years = [],
  { force = false } = {}
) => {
  const uniqueYears = [
    ...new Set(
      years
        .map(Number)
        .filter((year) => Boolean(year))
    ),
  ];

  if (!companyCode || uniqueYears.length === 0) {
    return [];
  }

  if (force) {
    uniqueYears.forEach((y) => holidayCache.delete(cacheKey(companyCode, y)));
  }

  const missingYears = uniqueYears.filter((y) => {
    const key = cacheKey(companyCode, y);
    return !readCache(key) && !inFlight.has(key);
  });

  if (missingYears.length > 1) {
    const request = getHolidaysApi(missingYears).then((result) => {
      if (apiFailed(result) || !Array.isArray(result.holidays)) {
        throw new Error(apiErrorMessage(result, "Failed to load holidays."));
      }
      return result.holidays;
    });

    // Each year's promise is registered so a concurrent caller asking for one
    // of them waits for this request instead of sending its own.
    missingYears.forEach((y) => {
      const key = cacheKey(companyCode, y);
      const yearRequest = request
        .then((all) => {
          const list = all.filter((h) => getHolidayYear(h?.date) === y);
          writeCache(key, list);
          return list;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, yearRequest);
    });
  }

  try {
    const lists = await Promise.all(
      uniqueYears.map((y) => {
        const key = cacheKey(companyCode, y);
        return readCache(key) || inFlight.get(key) || fetchYear(companyCode, y);
      })
    );

    return lists.flat();
  } catch (error) {
    throw failWith(
      error,
      "Get Holidays Error",
      "Failed to load holidays."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Holiday
|--------------------------------------------------------------------------
*/

export const updateHoliday = async (
  companyCode,
  currentDate,
  holidayId,
  updates
) => {
  if (!companyCode || !currentDate || !holidayId) {
    return {
      success: false,
      message: "Holiday not found.",
    };
  }

  const validationError = validateHolidayInput(updates);

  if (validationError) {
    return {
      success: false,
      message: validationError,
    };
  }

  try {
    const result = await updateHolidayApi(
      currentDate,
      holidayId,
      {
        name: String(updates.name).trim(),
        date: String(updates.date).trim(),
        type: updates.type,
        description: String(updates.description || "").trim(),
        isOptional: Boolean(updates.isOptional),
      }
    );

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to update holiday."),
      };
    }

    clearHolidayCache(companyCode);

    return {
      success: true,
      year: Number(
        result.year || getHolidayYear(updates.date)
      ),
      ...(result.moved ? { moved: true } : {}),
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
  date,
  holidayId
) => {
  if (!companyCode || !date || !holidayId) {
    return {
      success: false,
      message: "Holiday not found.",
    };
  }

  try {
    const result = await deleteHolidayApi(date, holidayId);

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to delete holiday."),
      };
    }

    clearHolidayCache(companyCode);

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
| Import Holidays
|--------------------------------------------------------------------------
| Rows already parsed and checked by the import modal. The server checks
| them again and skips any date that is already a holiday, so the result
| reports what was added, what was skipped and what was rejected.
*/

export const importHolidays = async (companyCode, rows = []) => {
  if (!companyCode) {
    return { success: false, message: "Company not found." };
  }

  try {
    const result = await importHolidaysApi(
      rows.map((row) => ({
        rowNumber: row.rowNumber,
        date: row.date,
        name: row.name,
        type: row.type,
        description: row.description || "",
        isOptional: Boolean(row.isOptional),
      }))
    );

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to import holidays."),
      };
    }

    clearHolidayCache(companyCode);

    return {
      success: true,
      count: result.count || 0,
      skipped: Array.isArray(result.skipped) ? result.skipped : [],
      invalid: Array.isArray(result.invalid) ? result.invalid : [],
      years: Array.isArray(result.years) ? result.years : [],
    };
  } catch (error) {
    throw failWith(error, "Import Holidays Error", "Failed to import holidays.");
  }
};

/*
|--------------------------------------------------------------------------
| Holiday Image
|--------------------------------------------------------------------------
| The banner picture behind a holiday on the upcoming panels. Every day of a
| multi-day holiday gets the same picture.
*/

export const uploadHolidayImage = async (companyCode, holiday, file) => {
  if (!companyCode || !holiday?.date || !holiday?.holidayId) {
    return { success: false, message: "Holiday not found." };
  }

  try {
    const result = await uploadHolidayImageApi(holiday.date, holiday.holidayId, file);

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to upload the image."),
      };
    }

    clearHolidayCache(companyCode);

    return { success: true, imageUrl: result.imageUrl };
  } catch (error) {
    throw failWith(error, "Upload Holiday Image Error", "Failed to upload the image.");
  }
};

export const removeHolidayImage = async (companyCode, holiday) => {
  if (!companyCode || !holiday?.date || !holiday?.holidayId) {
    return { success: false, message: "Holiday not found." };
  }

  try {
    const result = await removeHolidayImageApi(holiday.date, holiday.holidayId);

    if (apiFailed(result)) {
      return {
        success: false,
        message: apiErrorMessage(result, "Failed to remove the image."),
      };
    }

    clearHolidayCache(companyCode);

    return { success: true };
  } catch (error) {
    throw failWith(error, "Remove Holiday Image Error", "Failed to remove the image.");
  }
};

/*
|--------------------------------------------------------------------------
| Upcoming Holidays
|--------------------------------------------------------------------------
| The dedicated backend endpoint: one call, crossing into next year on its
| own when the current one has run out.
|--------------------------------------------------------------------------
*/

export const getUpcomingHolidays = async (
  companyCode,
  {
    from = getDateKey(),
    limit = UPCOMING_HOLIDAY_LIMIT,
  } = {}
) => {
  if (!companyCode) {
    return [];
  }

  try {
    const result = await getUpcomingHolidaysApi({ limit, from });

    if (apiFailed(result)) {
      throw new Error(
        apiErrorMessage(result, "Failed to load upcoming holidays.")
      );
    }

    return Array.isArray(result.holidays) ? result.holidays : [];
  } catch (error) {
    throw failWith(
      error,
      "Get Upcoming Holidays Error",
      "Failed to load upcoming holidays."
    );
  }
};
