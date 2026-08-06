import { MONTHS } from "../attendance/attendanceConstants";
import {
  formatDate,
  getDateKey,
  parseDateKey,
} from "../attendance/attendanceDate";
import { searchRows } from "../attendance/attendanceTable";
import {
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_NAME_MAX,
  HOLIDAY_NAME_MIN,
  HOLIDAY_TYPE,
  HOLIDAY_TYPE_OPTIONS,
  WEEKLY_OFF_DAYS,
} from "./holidayConstants";

/*
|--------------------------------------------------------------------------
| Holiday Utilities
|--------------------------------------------------------------------------
| Pure helpers for the holiday module: ordering, filtering, grouping, stats,
| calendar mapping, formatting and the working day maths that the attendance
| and leave modules read holidays through.
|
| Nothing here touches Firebase or React, so the same functions run in the
| dashboard, the modal, the leave apply form and the attendance reports.
|
| Dates are the `YYYY-MM-DD` keys the rest of the system already uses, which
| makes them safe to compare as plain strings and keeps them free of the
| timezone shift a `new Date("2026-08-05")` would introduce.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

/*
| A holiday belongs to the year its date falls in, which is the node it is
| stored under in the database.
*/

export const getHolidayYear = (date) => {

  const parsed = parseDateKey(date);

  return parsed ? parsed.getFullYear() : null;

};

export const getHolidayMonth = (date) => {

  const parsed = parseDateKey(date);

  return parsed ? parsed.getMonth() + 1 : null;

};

/*
| "January" from a 1 based month number. Out of range months return an empty
| string rather than `undefined`, so a label never renders as "undefined".
*/

export const monthName = (month) =>
  MONTHS[Number(month) - 1] || "";

/*
| "Monday" for a `YYYY-MM-DD` key.
*/

export const getDayName = (date, { short = false } = {}) => {

  const parsed = parseDateKey(date);

  if (!parsed) return "--";

  return parsed.toLocaleDateString("en-IN", {
    weekday: short ? "short" : "long",
  });

};

/*
| Saturday or Sunday. Kept separate from `isWeeklyOff` on purpose: a weekend
| is a fact about the calendar, while a weekly off is a company rule and only
| Sunday by default.
*/

export const isWeekend = (date) => {

  const parsed = parseDateKey(date);

  if (!parsed) return false;

  const day = parsed.getDay();

  return day === 0 || day === 6;

};

export const isWeeklyOff = (date) => {

  const parsed = parseDateKey(date);

  if (!parsed) return false;

  return WEEKLY_OFF_DAYS.includes(parsed.getDay());

};

/*
| Whole days between two `YYYY-MM-DD` keys. Used for the countdown on the
| upcoming cards, so a holiday can say "in 3 days" without a clock.
|
| Counted from the calendar parts rather than the millisecond gap: across a
| daylight saving change a "day" is 23 or 25 hours long and a millisecond
| division rounds the answer off by one.
*/

export const daysBetween = (fromDate, toDate) => {

  const start = parseDateKey(fromDate);
  const end = parseDateKey(toDate);

  if (!start || !end) return null;

  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endDay = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.round(
    (endDay - startDay) / (1000 * 60 * 60 * 24)
  );

};

/*
| Every `YYYY-MM-DD` key from one date to another, both ends included.
|
| Guarded against a range with the dates the wrong way round and capped at a
| year, so a malformed range can never loop forever.
*/

export const getDateKeysBetween = (fromDate, toDate) => {

  const start = parseDateKey(fromDate);

  if (!start) return [];

  const end = parseDateKey(toDate) || start;

  const keys = [];

  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  while (cursor <= end && keys.length < 366) {

    keys.push(getDateKey(cursor));

    cursor.setDate(cursor.getDate() + 1);

  }

  return keys;

};

/*
|--------------------------------------------------------------------------
| Lookups
|--------------------------------------------------------------------------
| Anything that walks a month or a leave range asks these instead of firing
| one database read per day: the year is fetched once and turned into a map
| or a set here.
*/

export const buildHolidayMap = (holidays = []) => {

  const map = {};

  holidays.forEach((holiday) => {

    if (!holiday?.date) return;

    map[holiday.date] = holiday;

  });

  return map;

};

export const getHolidayDates = (holidays = []) =>
  holidays
    .map((holiday) => holiday?.date)
    .filter(Boolean);

/*
| Accepts a Set, an array of date keys, an array of holidays or a date keyed
| map, so a caller can pass whichever shape it already has instead of
| converting first.
*/

export const toHolidaySet = (holidays) => {

  if (!holidays) return new Set();

  if (holidays instanceof Set) return holidays;

  if (Array.isArray(holidays)) {

    return new Set(
      holidays.map((item) =>
        typeof item === "string" ? item : item?.date
      ).filter(Boolean)
    );

  }

  return new Set(Object.keys(holidays));

};

/*
| Whether a single day is a declared holiday.
*/

export const isHoliday = (date, holidays) =>
  Boolean(date) && toHolidaySet(holidays).has(date);

export const getHolidayOn = (date, holidays = []) =>
  holidays.find((holiday) => holiday?.date === date) || null;

/*
|--------------------------------------------------------------------------
| Working Days
|--------------------------------------------------------------------------
| A day that is not worked is either a declared holiday or a weekly off. Both
| are skipped when a leave range is priced, so an employee is not charged a
| leave day for a day the company was closed anyway.
*/

export const isNonWorkingDay = (date, holidays) =>
  isWeeklyOff(date) || isHoliday(date, holidays);

export const isWorkingDay = (date, holidays) =>
  Boolean(date) && !isNonWorkingDay(date, holidays);

/*
| The working days of a range, and the days it skipped, so the leave preview
| can explain why five calendar days cost three.
*/

export const getWorkingDayBreakdown = (
  fromDate,
  toDate,
  holidays
) => {

  const holidaySet = toHolidaySet(holidays);

  const dateKeys = getDateKeysBetween(fromDate, toDate);

  const workingDays = [];
  const holidayDays = [];
  const weeklyOffDays = [];

  dateKeys.forEach((date) => {

    /*
    | A holiday that lands on a weekly off is counted once, as a holiday, so
    | the two skipped counts can be added up without overlapping.
    */

    if (holidaySet.has(date)) {
      holidayDays.push(date);
      return;
    }

    if (isWeeklyOff(date)) {
      weeklyOffDays.push(date);
      return;
    }

    workingDays.push(date);

  });

  return {
    totalDays: dateKeys.length,
    workingDays,
    holidayDays,
    weeklyOffDays,
    skippedDays: holidayDays.length + weeklyOffDays.length,
  };

};

export const countWorkingDays = (
  fromDate,
  toDate,
  holidays
) =>
  getWorkingDayBreakdown(fromDate, toDate, holidays)
    .workingDays.length;

/*
|--------------------------------------------------------------------------
| Sorting
|--------------------------------------------------------------------------
| By date by default, which is the order a holiday list is read in. Date keys
| sort correctly as strings because they are zero padded.
*/

export const sortHolidays = (
  holidays = [],
  order = "asc"
) => {

  const direction = order === "desc" ? -1 : 1;

  return [...holidays].sort(
    (a, b) =>
      String(a?.date ?? "").localeCompare(String(b?.date ?? "")) *
      direction
  );

};

/*
|--------------------------------------------------------------------------
| Filtering
|--------------------------------------------------------------------------
| Search runs over the fields a holiday is looked for by; the type and the
| optional flag narrow it further.
|
| `optional` is a tri state: "" for every holiday, "optional" for the ones
| that are, and "mandatory" for the ones that are not. A boolean could not
| tell "no filter" apart from "not optional".
*/

const SEARCH_FIELDS = [
  "name",
  "type",
  "description",
  "date",
  "holidayId",
];

export const filterHolidays = (
  holidays = [],
  { search = "", type = "", optional = "", month = "" } = {}
) =>
  searchRows(holidays, search, SEARCH_FIELDS).filter((holiday) => {

    const matchesType =
      !type || holiday.type === type;

    const matchesOptional =
      !optional ||
      (optional === "optional"
        ? Boolean(holiday.isOptional)
        : !holiday.isOptional);

    const matchesMonth =
      !month ||
      getHolidayMonth(holiday.date) === Number(month);

    return matchesType && matchesOptional && matchesMonth;

  });

export const filterHolidaysByYear = (
  holidays = [],
  year
) =>
  holidays.filter(
    (holiday) => getHolidayYear(holiday?.date) === Number(year)
  );

/*
|--------------------------------------------------------------------------
| Grouping
|--------------------------------------------------------------------------
| Holidays of a year bucketed into the months they fall in, in calendar
| order. Empty months are dropped, so a year with four holidays renders four
| groups instead of twelve, eight of them blank.
*/

export const groupHolidaysByMonth = (holidays = []) => {

  const groups = new Map();

  sortHolidays(holidays).forEach((holiday) => {

    const month = getHolidayMonth(holiday?.date);

    if (!month) return;

    if (!groups.has(month)) {

      groups.set(month, {
        month,
        label: monthName(month),
        holidays: [],
      });

    }

    groups.get(month).holidays.push(holiday);

  });

  return [...groups.values()].sort(
    (a, b) => a.month - b.month
  );

};

/*
|--------------------------------------------------------------------------
| Upcoming
|--------------------------------------------------------------------------
| The holidays still to come, nearest first, each carrying the number of days
| until it so a card can say "Today", "Tomorrow" or "in 12 days" without
| recomputing it while rendering.
*/

export const getUpcomingHolidays = (
  holidays = [],
  { from = getDateKey(), limit = 0 } = {}
) => {

  const upcoming = sortHolidays(
    holidays.filter((holiday) => holiday?.date >= from)
  ).map((holiday) => ({
    ...holiday,
    daysUntil: daysBetween(from, holiday.date),
  }));

  return limit > 0
    ? upcoming.slice(0, limit)
    : upcoming;

};

export const isPastHoliday = (
  holiday,
  from = getDateKey()
) =>
  Boolean(holiday?.date) && holiday.date < from;

/*
| "Today", "Tomorrow", "in 12 days" or "12 days ago".
*/

export const formatDaysUntil = (days) => {

  if (days === null || days === undefined) return "--";

  if (days === 0) return "Today";

  if (days === 1) return "Tomorrow";

  if (days < 0) {

    const past = Math.abs(days);

    return `${past} day${past === 1 ? "" : "s"} ago`;

  }

  return `in ${days} days`;

};

/*
|--------------------------------------------------------------------------
| Stats
|--------------------------------------------------------------------------
| The counts the dashboard cards show. Optional is a flag rather than a type,
| so an optional festival is counted under both.
*/

export const getHolidayStats = (
  holidays = [],
  { from = getDateKey() } = {}
) => {

  const stats = {
    total: holidays.length,
    national: 0,
    festival: 0,
    company: 0,
    optional: 0,
    mandatory: 0,
    upcoming: 0,
    past: 0,
  };

  holidays.forEach((holiday) => {

    switch (holiday?.type) {

      case HOLIDAY_TYPE.NATIONAL:
        stats.national++;
        break;

      case HOLIDAY_TYPE.FESTIVAL:
        stats.festival++;
        break;

      case HOLIDAY_TYPE.COMPANY:
        stats.company++;
        break;

      default:
        break;

    }

    if (holiday?.isOptional) {
      stats.optional++;
    } else {
      stats.mandatory++;
    }

    if (holiday?.date && holiday.date >= from) {
      stats.upcoming++;
    } else {
      stats.past++;
    }

  });

  return stats;

};

/*
|--------------------------------------------------------------------------
| Calendar
|--------------------------------------------------------------------------
| A `{ "YYYY-MM-DD": { holiday, className } }` map for the calendar tiles.
|
| The class is the lower cased type, so a holiday maps straight onto a tile
| style without a second lookup table. An optional holiday carries a second
| class, which is what draws it as an outline instead of a filled circle.
*/

export const getHolidayCalendarMap = (holidays = []) => {

  const calendar = {};

  holidays.forEach((holiday) => {

    if (!holiday?.date || !holiday?.type) return;

    calendar[holiday.date] = {

      holiday,

      className: `holiday-${String(holiday.type).toLowerCase()}${
        holiday.isOptional ? " holiday-optional" : ""
      }`,

    };

  });

  return calendar;

};

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

/*
| "05 Aug 2026". Delegates to the shared date formatter so holiday dates read
| exactly like attendance and leave dates everywhere they sit side by side.
*/

export const formatHolidayDate = (date) =>
  formatDate(date);

/*
| "Mon, 05 Aug 2026" for the places that show the day of the week inline.
*/

export const formatHolidayDateWithDay = (date) => {

  const parsed = parseDateKey(date);

  if (!parsed) return "--";

  return `${getDayName(date, { short: true })}, ${formatDate(date)}`;

};

/*
| The label shown next to a holiday: an optional one says so, because it is
| the difference between a day off and a day that may be taken off.
*/

export const formatHolidayType = (holiday) => {

  if (typeof holiday === "string") {
    return holiday || "--";
  }

  if (!holiday?.type) return "--";

  return holiday.isOptional
    ? `${holiday.type} · Optional`
    : holiday.type;

};

/*
|--------------------------------------------------------------------------
| Form Validation
|--------------------------------------------------------------------------
| Returns a `{ field: message }` map so the modal can render errors inline,
| the same way the manual attendance form does.
|
| The service validates again before it writes: this is the instant feedback,
| that is the guarantee.
|
| The date is checked by rebuilding it, because `2026-02-31` parses into the
| 3rd of March and a date that does not come back as it went in never existed.
*/

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const validateHolidayForm = (form = {}) => {

  const errors = {};

  const name = String(form.name || "").trim();

  if (!name) {
    errors.name = "Holiday name is required.";
  } else if (name.length < HOLIDAY_NAME_MIN) {
    errors.name = `Enter at least ${HOLIDAY_NAME_MIN} characters.`;
  } else if (name.length > HOLIDAY_NAME_MAX) {
    errors.name = `Cannot exceed ${HOLIDAY_NAME_MAX} characters.`;
  }

  const date = String(form.date || "").trim();

  const parsed = DATE_PATTERN.test(date)
    ? parseDateKey(date)
    : null;

  if (!date) {
    errors.date = "Please select a holiday date.";
  } else if (!parsed || getDateKey(parsed) !== date) {
    errors.date = "Please select a valid holiday date.";
  }

  if (!form.type) {
    errors.type = "Please select a holiday type.";
  } else if (!HOLIDAY_TYPE_OPTIONS.includes(form.type)) {
    errors.type = "Please select a valid holiday type.";
  }

  if (
    String(form.description || "").trim().length >
    HOLIDAY_DESCRIPTION_MAX
  ) {
    errors.description = `Cannot exceed ${HOLIDAY_DESCRIPTION_MAX} characters.`;
  }

  return errors;

};

/*
| A duplicate is caught by the service against the stored year, but the modal
| already has the list on screen and can say so before a save is attempted.
*/

export const findHolidayConflict = (
  holidays = [],
  { date, name, ignoreId = "" }
) => {

  const nameKey = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return (
    holidays.find((holiday) => {

      if (!holiday || holiday.holidayId === ignoreId) return false;

      const sameName =
        Boolean(nameKey) &&
        String(holiday.name || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ") === nameKey;

      return holiday.date === date || sameName;

    }) || null
  );

};

/*
|--------------------------------------------------------------------------
| Export Rows
|--------------------------------------------------------------------------
| The CSV shape, kept next to the data it describes so the header and the row
| builder cannot drift apart.
*/

export const HOLIDAY_EXPORT_HEADER = [
  "Holiday ID",
  "Name",
  "Date",
  "Day",
  "Type",
  "Optional",
  "Description",
  "Created By",
];

export const toHolidayExportRow = (holiday = {}) => [
  holiday.holidayId,
  holiday.name,
  holiday.date,
  getDayName(holiday.date),
  holiday.type,
  holiday.isOptional ? "Yes" : "No",
  holiday.description || "",
  holiday.createdBy || "",
];
