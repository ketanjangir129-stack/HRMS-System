/*
|--------------------------------------------------------------------------
| Holiday Constants
|--------------------------------------------------------------------------
| Single source of truth for every value the holiday module repeats: the
| holiday types, their badge colours, the calendar legend, the table page
| size and the days of the week that are not worked.
|
| Types are stored as their label, the same way attendance statuses and leave
| request types are, so a record reads the same in the database as it does on
| screen.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Holiday Types
|--------------------------------------------------------------------------
| Four types plus the optional flag, which is what the stats cards count:
| National, Festival, Company, Event and "optional" across all of them.
|
| Event is a fixed company event (Annual Day, Foundation Day). Like every
| other type it is a day off for attendance and leave.
*/

export const HOLIDAY_TYPE = {
  NATIONAL: "National",
  FESTIVAL: "Festival",
  COMPANY: "Company",
  EVENT: "Event",
};

export const HOLIDAY_TYPE_OPTIONS = [
  HOLIDAY_TYPE.NATIONAL,
  HOLIDAY_TYPE.FESTIVAL,
  HOLIDAY_TYPE.COMPANY,
  HOLIDAY_TYPE.EVENT,
];

/*
| The cards the modal offers, with the description that explains the choice.
*/

export const HOLIDAY_TYPES = [
  {
    value: HOLIDAY_TYPE.NATIONAL,
    label: "National",
    description: "Declared by the government",
  },
  {
    value: HOLIDAY_TYPE.FESTIVAL,
    label: "Festival",
    description: "Religious or cultural festival",
  },
  {
    value: HOLIDAY_TYPE.COMPANY,
    label: "Company",
    description: "Declared by the company",
  },
  {
    value: HOLIDAY_TYPE.EVENT,
    label: "Company Event",
    description: "Fixed event, e.g. Annual Day",
  },
];

/*
|--------------------------------------------------------------------------
| Badges
|--------------------------------------------------------------------------
| Same shape as the attendance status badges, so the shared badge component
| can render a holiday type without a second styling system.
*/

export const HOLIDAY_TYPE_BADGES = {
  [HOLIDAY_TYPE.NATIONAL]: "bg-blue-50 text-blue-700 ring-blue-200",
  [HOLIDAY_TYPE.FESTIVAL]: "bg-amber-50 text-amber-700 ring-amber-200",
  [HOLIDAY_TYPE.COMPANY]: "bg-violet-50 text-violet-700 ring-violet-200",
  [HOLIDAY_TYPE.EVENT]: "bg-pink-50 text-pink-700 ring-pink-200",
};

export const HOLIDAY_TYPE_DOTS = {
  [HOLIDAY_TYPE.NATIONAL]: "bg-blue-500",
  [HOLIDAY_TYPE.FESTIVAL]: "bg-amber-500",
  [HOLIDAY_TYPE.COMPANY]: "bg-violet-500",
  [HOLIDAY_TYPE.EVENT]: "bg-pink-500",
};

export const OPTIONAL_BADGE =
  "bg-emerald-50 text-emerald-700 ring-emerald-200";

/*
|--------------------------------------------------------------------------
| Calendar
|--------------------------------------------------------------------------
| Tile classes are the lower cased type, so a holiday maps straight onto a
| class without a second lookup table.
*/

export const HOLIDAY_CALENDAR_LEGEND = [
  { label: "National", color: "bg-blue-500" },
  { label: "Festival", color: "bg-amber-500" },
  { label: "Company", color: "bg-violet-500" },
  { label: "Event", color: "bg-pink-500" },
];

/*
|--------------------------------------------------------------------------
| Working Week
|--------------------------------------------------------------------------
| The days of the week that are never worked, as `Date.getDay()` numbers
| (0 = Sunday). Leave duration skips them the same way it skips a declared
| holiday, so a range that runs over a weekly off is not charged for it.
|
| A company that works six days keeps `[0]`; one that works five adds `6`.
*/

export const WEEKLY_OFF_DAYS = [0];

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

export const HOLIDAY_NAME_MIN = 3;

export const HOLIDAY_NAME_MAX = 60;

export const HOLIDAY_DESCRIPTION_MAX = 200;

/*
|--------------------------------------------------------------------------
| Tables & Panels
|--------------------------------------------------------------------------
*/

export const HOLIDAY_PAGE_SIZE = 8;

export const UPCOMING_HOLIDAYS = 5;

/*
| How far ahead an "upcoming" holiday may sit before it stops being upcoming.
| Used by the service to decide whether the next year has to be read as well.
*/

export const UPCOMING_HOLIDAY_LIMIT = 10;

/*
|--------------------------------------------------------------------------
| Multiple Dates, Import & Images
|--------------------------------------------------------------------------
| The limits match the backend, so a file or a date list is refused here
| with a clear message instead of by the server.
*/

export const HOLIDAY_DATE_MODE = {
  SINGLE: "single",
  RANGE: "range",
  MULTIPLE: "multiple",
};

export const HOLIDAY_MULTIPLE_DATES_MAX = 60;

export const HOLIDAY_IMPORT_MAX_ROWS = 500;

export const HOLIDAY_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export const HOLIDAY_IMPORT_COLUMNS = ["Date", "Name", "Type", "Description"];

export const HOLIDAY_IMPORT_ACCEPT = ".xlsx,.xls,.csv,.pdf";

export const HOLIDAY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const HOLIDAY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
