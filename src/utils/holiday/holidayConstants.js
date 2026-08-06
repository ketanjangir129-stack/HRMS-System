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
| Three types plus the optional flag, which is what the stats cards count:
| National, Festival, Company and "optional" across all three.
*/

export const HOLIDAY_TYPE = {
  NATIONAL: "National",
  FESTIVAL: "Festival",
  COMPANY: "Company",
};

export const HOLIDAY_TYPE_OPTIONS = [
  HOLIDAY_TYPE.NATIONAL,
  HOLIDAY_TYPE.FESTIVAL,
  HOLIDAY_TYPE.COMPANY,
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
};

export const HOLIDAY_TYPE_DOTS = {
  [HOLIDAY_TYPE.NATIONAL]: "bg-blue-500",
  [HOLIDAY_TYPE.FESTIVAL]: "bg-amber-500",
  [HOLIDAY_TYPE.COMPANY]: "bg-violet-500",
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
