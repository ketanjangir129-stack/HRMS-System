
const db = require("../config/firebase");
const cloudinary = require("../config/cloudinary");
const { getDateKey } = require("../utils/attendanceDate");
const { uploadFile } = require("./uploadServices");

// "Event" is a fixed company event (Annual Day, Foundation Day) - declared by
// the company like "Company", but kept apart so it can be told from a closure.
const HOLIDAY_TYPES = ["National", "Festival", "Company", "Event"];

/*
| Writes for one company run one at a time. The duplicate check reads the
| year and then writes, so two admins saving the same date at the same moment
| could both pass it; queuing them makes the second one see the first.
| (Per process - a multi-instance deployment would need a DB-side date index.)
*/
const companyLocks = new Map();

const withCompanyLock = (companyCode, task) => {
  const previous = companyLocks.get(companyCode) || Promise.resolve();
  const run = previous.catch(() => {}).then(task);
  const tail = run.catch(() => {});
  companyLocks.set(companyCode, tail);
  tail.then(() => {
    if (companyLocks.get(companyCode) === tail) companyLocks.delete(companyCode);
  });
  return run;
};

// Firebase keys cannot contain . # $ [ ] or /, and an id carrying one would
// otherwise surface as a 500 from the SDK instead of a 400.
const INVALID_KEY_CHARS = /[.#$[\]/]/;

const validateHolidayId = (holidayId) => {
  if (
    typeof holidayId !== "string" ||
    !holidayId.trim() ||
    holidayId.length > 128 ||
    INVALID_KEY_CHARS.test(holidayId)
  ) {
    fail("A valid holiday ID is required.");
  }
  return holidayId;
};

/*
| Who is acting, read from the token and the database - never from the
| request body, which anyone can fill with someone else's name.
*/
const resolveActorName = async (companyCode, user) => {
  try {
    if (user?.role === "owner" || !user?.employeeId) {
      const snap = await db.ref(`companies/${companyCode}/details/ownerName`).once("value");
      return snap.val() || user?.email || "Owner";
    }

    const snap = await db
      .ref(`companies/${companyCode}/employees/${String(user.employeeId).toUpperCase()}/personalInfo/name`)
      .once("value");
    return snap.val() || user.employeeId;
  } catch {
    return user?.employeeId || user?.email || "Admin";
  }
};

const actorId = (user) =>
  user?.employeeId || user?.uid || user?.userId || "system";
const NAME_MIN = 3;
const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;

const fail = (message, statusCode = 400, code = "BAD_REQUEST") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
};

const validateDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail("Date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    fail("Please provide a valid holiday date.");
  }

  return date;
};

const getYear = (date) => validateDate(date).slice(0, 4);

const getMonthPath = (date) => {
  const month = Number(date.slice(5, 7));
  const names = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  return `${getYear(date)}/${names[month - 1]}`;
};

const holidayPath = (companyCode, date, holidayId) =>
  `companies/${companyCode}/holidays/${getMonthPath(date)}/${holidayId}`;

const normalizeName = (name) =>
  String(name || "").trim().toLowerCase().replace(/\s+/g, " ");

const validateHoliday = (input, { partial = false } = {}) => {
  const result = {};

  if (!partial || input.name !== undefined) {
    if (typeof input.name !== "string") {
      fail("Holiday name is required.");
    }

    result.name = input.name.trim();

    if (result.name.length < NAME_MIN || result.name.length > NAME_MAX) {
      fail(`Holiday name must be between ${NAME_MIN} and ${NAME_MAX} characters.`);
    }
  }

  if (!partial || input.date !== undefined) {
    result.date = validateDate(input.date);
  }

  if (!partial || input.type !== undefined) {
    if (!HOLIDAY_TYPES.includes(input.type)) {
      fail("Holiday type must be National, Festival, Company, or Event.");
    }

    result.type = input.type;
  }

  if (!partial || input.description !== undefined) {
    const description = input.description ?? "";

    if (typeof description !== "string") {
      fail("Holiday description must be text.");
    }

    result.description = description.trim();

    if (result.description.length > DESCRIPTION_MAX) {
      fail(`Holiday description cannot exceed ${DESCRIPTION_MAX} characters.`);
    }
  }

  if (input.isOptional !== undefined) {
    if (typeof input.isOptional !== "boolean") {
      fail("isOptional must be a boolean.");
    }
    result.isOptional = input.isOptional;
  } else if (!partial) {
    result.isOptional = false;
  }

  return result;
};

const getYearRecords = async (companyCode, year) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/holidays/${year}`)
    .once("value");

  const data = snapshot.val() || {};

  const records = [];
  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val !== "object") continue;
    // Flat structure (year/holidayId)
    if (val.date && val.name) {
      records.push({
        ...val,
        holidayId: val.holidayId || key,
      });
    } else {
      // Month-nested structure (year/Month/holidayId)
      for (const [holidayId, holiday] of Object.entries(val)) {
        if (holiday && typeof holiday === "object") {
          records.push({
            ...holiday,
            holidayId: holiday.holidayId || holidayId,
          });
        }
      }
    }
  }

  return records;
};

const ensureNoDuplicate = async (
  companyCode,
  holiday,
  { excludeHolidayId, records: preloaded } = {}
) => {
  // `records` lets a caller checking many dates read each year once.
  const records =
    preloaded ||
    (await getYearRecords(companyCode, getYear(holiday.date)));

  const duplicate = records.find((record) => {
    if (record.holidayId === excludeHolidayId) return false;

    // Check if another holiday already exists on this date
    return record.date === holiday.date;
  });

  if (duplicate) {
    fail(
      `A holiday already exists on this date (${holiday.date}): "${duplicate.name}".`,
      409,
      "HOLIDAY_DUPLICATE"
    );
  }
};

const getHoliday = async (companyCode, date, holidayId) => {
  validateDate(date);
  validateHolidayId(holidayId);

  const snapshot = await db
    .ref(holidayPath(companyCode, date, holidayId))
    .once("value");

  if (!snapshot.exists()) {
    fail("Holiday not found.", 404, "HOLIDAY_NOT_FOUND");
  }

  return { ...snapshot.val(), holidayId };
};

const listHolidays = async (companyCode, year) => {
  if (!/^\d{4}$/.test(String(year))) {
    fail("A valid four-digit year is required.");
  }

  const records = await getYearRecords(companyCode, String(year));

  return records.sort((a, b) =>
    String(a?.date || "").localeCompare(String(b?.date || ""))
  );
};

const getUpcomingHolidays = async (
  companyCode,
  { limit = 5, from } = {}
) => {
  // Today in IST, not UTC (toISOString is still yesterday until 05:30 IST),
  // and a supplied `from` is used only if it is a real calendar date.
  let today = getDateKey(Date.now());
  if (from) {
    try {
      today = validateDate(from);
    } catch {
      // Ignore a malformed `from` and fall back to today.
    }
  }
  const currentYear = Number(today.slice(0, 4));

  const currentYearHolidays = await listHolidays(companyCode, currentYear);
  let upcoming = currentYearHolidays.filter(
    (h) => h?.date && h.date >= today
  );

  if (upcoming.length < limit) {
    const nextYearHolidays = await listHolidays(
      companyCode,
      currentYear + 1
    );
    upcoming = upcoming.concat(
      nextYearHolidays.filter((h) => h?.date && h.date >= today)
    );
  }

  return upcoming
    .sort((a, b) =>
      String(a?.date || "").localeCompare(String(b?.date || ""))
    )
    .slice(0, limit);
};

const withoutUndefined = (record) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );

const MAX_MULTI_DAY = 30;

const listDateRange = (startDate, endDate) => {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    if (dates.length > MAX_MULTI_DAY) {
      fail(`A multi-day holiday cannot exceed ${MAX_MULTI_DAY} consecutive days.`);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

/*
| "Diwali (Day 2)". The base name is shortened when needed so the suffix never
| pushes a name the form accepted past NAME_MAX.
*/
const dayName = (baseName, index, total) => {
  if (total <= 1) return baseName;
  const suffix = ` (Day ${index + 1})`;
  return `${baseName.slice(0, NAME_MAX - suffix.length).trim()}${suffix}`;
};

const newHolidayId = (companyCode, date) =>
  db
    .ref(`companies/${companyCode}/holidays/${getMonthPath(date)}`)
    .push().key;

const MAX_MULTIPLE_DATES = 60;

/*
| Several separate dates under one name and type (every second Saturday, a
| festival observed on two non-consecutive days). Each date is its own record,
| written together with a shared group id, exactly like a range.
*/
const createHolidayDates = async (companyCode, input, actor) => {
  if (!Array.isArray(input.dates) || input.dates.length === 0) {
    fail("Select at least one holiday date.");
  }

  const dateList = [...new Set(input.dates.map((d) => validateDate(String(d).trim())))]
    .sort();

  if (dateList.length > MAX_MULTIPLE_DATES) {
    fail(`At most ${MAX_MULTIPLE_DATES} dates can be declared at once.`);
  }

  const holidays = dateList.map((date) => validateHoliday({ ...input, date }));

  const years = [...new Set(dateList.map(getYear))];
  const yearRecords = Object.fromEntries(
    await Promise.all(
      years.map(async (y) => [y, await getYearRecords(companyCode, y)])
    )
  );

  for (const holiday of holidays) {
    await ensureNoDuplicate(companyCode, holiday, {
      records: yearRecords[getYear(holiday.date)],
    });
  }

  const groupId = dateList.length > 1 ? newHolidayId(companyCode, dateList[0]) : undefined;
  const records = [];
  const updates = {};

  holidays.forEach((holidayData) => {
    const holidayId = newHolidayId(companyCode, holidayData.date);
    const record = withoutUndefined({
      ...holidayData,
      holidayId,
      groupId,
      ...actor,
    });
    records.push(record);
    updates[holidayPath(companyCode, holidayData.date, holidayId)] = record;
  });

  await db.ref().update(updates);

  return {
    holiday: records[0],
    holidays: records,
    count: records.length,
    year: getYear(dateList[0]),
    years: years.map(Number),
    isMultiDay: records.length > 1,
  };
};

const createHoliday = (companyCode, input, user) =>
  withCompanyLock(companyCode, async () => {
    if (Array.isArray(input?.dates)) {
      const now = Date.now();
      return createHolidayDates(companyCode, input, {
        createdBy: await resolveActorName(companyCode, user),
        createdById: actorId(user),
        createdAt: now,
        updatedAt: now,
      });
    }

    const isMultiDay = Boolean(
      input?.isMultiDay &&
        input?.endDate &&
        String(input.endDate).trim() !== String(input.date).trim()
    );

    const now = Date.now();

    // From the token, not `input.createdBy`: the audit field cannot be spoofed.
    const createdBy = await resolveActorName(companyCode, user);
    const createdById = actorId(user);

    if (isMultiDay) {
      const startDate = validateDate(input.date);
      const endDate = validateDate(input.endDate);

      if (endDate < startDate) {
        fail("End date cannot be earlier than start date.");
      }

      const dateList = listDateRange(startDate, endDate);
      const baseName = String(input.name || "").trim();

      // Validate every day first, so nothing is written if any day is bad.
      const holidays = dateList.map((d, idx) =>
        validateHoliday({
          ...input,
          date: d,
          name: dayName(baseName, idx, dateList.length),
        })
      );

      // One read per year spanned (at most two), not one per day.
      const years = [...new Set(dateList.map(getYear))];
      const yearRecords = Object.fromEntries(
        await Promise.all(
          years.map(async (y) => [y, await getYearRecords(companyCode, y)])
        )
      );

      for (const holiday of holidays) {
        await ensureNoDuplicate(companyCode, holiday, {
          records: yearRecords[getYear(holiday.date)],
        });
      }

      // The days of one festival share a group id, so they can be found -
      // and later edited or removed - together.
      const groupId = newHolidayId(companyCode, startDate);
      const records = [];
      const updates = {};

      holidays.forEach((holidayData) => {
        const holidayId = newHolidayId(companyCode, holidayData.date);

        const record = {
          ...holidayData,
          holidayId,
          groupId,
          createdBy,
          createdById,
          createdAt: now,
          updatedAt: now,
        };

        records.push(record);
        updates[holidayPath(companyCode, holidayData.date, holidayId)] = record;
      });

      // Atomic: either every day is written or none is.
      await db.ref().update(updates);

      return {
        holiday: records[0],
        holidays: records,
        count: records.length,
        year: getYear(startDate),
        years: years.map(Number),
        isMultiDay: true,
      };
    }

    // Single date holiday
    const holiday = validateHoliday(input);

    await ensureNoDuplicate(companyCode, holiday);

    const holidayId = newHolidayId(companyCode, holiday.date);

    const record = {
      ...holiday,
      holidayId,
      createdBy,
      createdById,
      createdAt: now,
      updatedAt: now,
    };

    await db.ref(holidayPath(companyCode, holiday.date, holidayId)).set(record);

    return {
      holiday: record,
      count: 1,
      year: getYear(holiday.date),
    };
  });

const updateHoliday = (
  companyCode,
  currentDate,
  holidayId,
  input,
  user
) =>
  withCompanyLock(companyCode, async () => {
    const existing = await getHoliday(companyCode, currentDate, holidayId);
    const updates = validateHoliday(input, { partial: true });

    // Legacy records may lack createdById / createdAt; Firebase rejects
    // undefined values, so absent fields are dropped rather than written.
    const updated = withoutUndefined({
      ...existing,
      ...updates,
      holidayId,
      createdBy: existing.createdBy,
      createdById: existing.createdById,
      createdAt: existing.createdAt,
      updatedBy: await resolveActorName(companyCode, user),
      updatedById: actorId(user),
      updatedAt: Date.now(),
    });

    await ensureNoDuplicate(companyCode, updated, {
      excludeHolidayId: holidayId,
    });

    const oldPath = holidayPath(companyCode, currentDate, holidayId);
    const newPath = holidayPath(companyCode, updated.date, holidayId);

    if (oldPath === newPath) {
      await db.ref(oldPath).update(updated);
    } else {
      // Move atomically so a partial move cannot leave two records behind.
      await db.ref().update({
        [newPath]: updated,
        [oldPath]: null,
      });
    }

    return {
      holiday: updated,
      year: getYear(updated.date),
      previousYear: getYear(currentDate),
      moved: oldPath !== newPath,
    };
  });

const deleteHoliday = async (companyCode, date, holidayId) => {
  const existing = await getHoliday(companyCode, date, holidayId);

  await db.ref(holidayPath(companyCode, date, holidayId)).remove();

  return {
    holidayId,
    date: existing.date,
  };
};

/*
|--------------------------------------------------------------------------
| Import
|--------------------------------------------------------------------------
| Rows from a Date / Name / Type / Description file, already parsed by the
| browser. Every row is validated again here; a bad row is reported back
| rather than failing the whole file, and a date that is already a holiday
| (in the database or earlier in the same file) is skipped, not overwritten.
| Everything that passes is written in one atomic update.
*/

const MAX_IMPORT_ROWS = 500;

const importHolidays = (companyCode, rows, user) =>
  withCompanyLock(companyCode, async () => {
    if (!Array.isArray(rows) || rows.length === 0) {
      fail("The file has no holiday rows to import.");
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      fail(`At most ${MAX_IMPORT_ROWS} holidays can be imported at once.`);
    }

    const valid = [];
    const invalid = [];

    rows.forEach((row, index) => {
      const rowNumber = Number(row?.rowNumber) || index + 1;
      try {
        valid.push({
          rowNumber,
          holiday: validateHoliday({
            name: row?.name,
            date: typeof row?.date === "string" ? row.date.trim() : row?.date,
            type: row?.type,
            description: row?.description ?? "",
            isOptional: typeof row?.isOptional === "boolean" ? row.isOptional : false,
          }),
        });
      } catch (error) {
        invalid.push({ rowNumber, message: error.message });
      }
    });

    const years = [...new Set(valid.map((v) => getYear(v.holiday.date)))];
    const takenDates = new Map();

    await Promise.all(
      years.map(async (y) => {
        (await getYearRecords(companyCode, y)).forEach((record) => {
          if (record?.date) takenDates.set(record.date, record.name);
        });
      })
    );

    const skipped = [];
    const updates = {};
    const created = [];
    const now = Date.now();
    const createdBy = await resolveActorName(companyCode, user);
    const createdById = actorId(user);

    valid.forEach(({ rowNumber, holiday }) => {
      if (takenDates.has(holiday.date)) {
        skipped.push({
          rowNumber,
          date: holiday.date,
          message: `"${takenDates.get(holiday.date)}" already exists on ${holiday.date}.`,
        });
        return;
      }

      takenDates.set(holiday.date, holiday.name);

      const holidayId = newHolidayId(companyCode, holiday.date);
      const record = {
        ...holiday,
        holidayId,
        source: "IMPORT",
        createdBy,
        createdById,
        createdAt: now,
        updatedAt: now,
      };

      created.push(record);
      updates[holidayPath(companyCode, holiday.date, holidayId)] = record;
    });

    if (created.length > 0) {
      await db.ref().update(updates);
    }

    return {
      count: created.length,
      holidays: created,
      skipped,
      invalid,
      years: [...new Set(created.map((h) => Number(getYear(h.date))))],
    };
  });

/*
|--------------------------------------------------------------------------
| Holiday Image
|--------------------------------------------------------------------------
| A banner picture for the upcoming holidays panels (diyas for Diwali, a flag
| for Independence Day). Stored on Cloudinary; the record keeps the URL.
|
| The days of a multi-day holiday share one picture, so setting it on one day
| sets it on every day in the same group.
*/

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// A group spans at most MAX_MULTIPLE_DATES days from its first date, so it
// can only reach into the neighbouring year from January or December.
const groupYears = (date) => {
  const year = Number(getYear(date));
  const month = Number(date.slice(5, 7));
  return [
    ...(month === 1 ? [year - 1] : []),
    year,
    ...(month === 12 ? [year + 1] : []),
  ].map(String);
};

const findGroupPaths = async (companyCode, holiday) => {
  if (!holiday.groupId) {
    return [holidayPath(companyCode, holiday.date, holiday.holidayId)];
  }

  const lists = await Promise.all(
    groupYears(holiday.date).map((y) => getYearRecords(companyCode, y))
  );

  const members = lists
    .flat()
    .filter((record) => record.groupId === holiday.groupId && record.date);

  return members.length
    ? members.map((record) => holidayPath(companyCode, record.date, record.holidayId))
    : [holidayPath(companyCode, holiday.date, holiday.holidayId)];
};

const destroyImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    // The record no longer points at it, so a leftover asset is harmless.
    console.error("Holiday image cleanup failed:", error);
  }
};

const writeHolidayImage = async (companyCode, date, holidayId, image, user) => {
  const existing = await getHoliday(companyCode, date, holidayId);
  const paths = await findGroupPaths(companyCode, existing);
  const now = Date.now();
  const updatedBy = await resolveActorName(companyCode, user);

  const updates = {};
  paths.forEach((path) => {
    updates[`${path}/imageUrl`] = image?.url || null;
    updates[`${path}/imagePublicId`] = image?.publicId || null;
    updates[`${path}/updatedAt`] = now;
    updates[`${path}/updatedBy`] = updatedBy;
    updates[`${path}/updatedById`] = actorId(user);
  });

  await db.ref().update(updates);

  if (existing.imagePublicId && existing.imagePublicId !== image?.publicId) {
    await destroyImage(existing.imagePublicId);
  }

  return {
    holidayId,
    imageUrl: image?.url || null,
    updatedCount: paths.length,
  };
};

const setHolidayImage = async (companyCode, date, holidayId, file, user) => {
  validateDate(date);
  validateHolidayId(holidayId);

  if (!file?.buffer) {
    fail("Please choose an image to upload.");
  }

  if (!IMAGE_TYPES.includes(file.mimetype)) {
    fail("Only JPG, PNG, WEBP or GIF images are allowed.");
  }

  if (file.size > IMAGE_MAX_BYTES) {
    fail("Image must be smaller than 5 MB.");
  }

  // Confirm the holiday exists before anything is uploaded.
  await getHoliday(companyCode, date, holidayId);

  const uploaded = await uploadFile(file.buffer, {
    folder: `hrms/${companyCode}/holidays`,
    resourceType: "image",
    maxBytes: IMAGE_MAX_BYTES,
    fileName: `${holidayId}_${file.originalname || "banner"}`,
    keepExisting: true,
  });

  return writeHolidayImage(companyCode, date, holidayId, uploaded, user);
};

const removeHolidayImage = (companyCode, date, holidayId, user) =>
  writeHolidayImage(companyCode, date, holidayId, null, user);

module.exports = {
  getHoliday,
  listHolidays,
  getUpcomingHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  importHolidays,
  setHolidayImage,
  removeHolidayImage,
};
