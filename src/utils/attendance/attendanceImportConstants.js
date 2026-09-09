import { ATTENDANCE_STATUS } from "./attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Import Constants
|--------------------------------------------------------------------------
| Everything the importer repeats: the fields a file is mapped onto, the
| shapes a date and a status are allowed to arrive in, and the limits the
| browser based import is run within.
|
| Nothing here invents an attendance concept. The statuses below are the ones
| declared in `attendanceConstants` and are imported from it rather than
| retyped, so a company that adds a sixth status gets it in the importer
| without a second edit - and an importer that recognised a status the rest of
| the module had never heard of would write days no report could count.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Fields
|--------------------------------------------------------------------------
| The six columns an attendance file is mapped onto.
|
| Only the employee id and the date are required, and for the same reason:
| together they are the address a record is written to. Everything else
| describes the day rather than identifying it, so a file that carries only
| those two still imports - as a day marked with a status and no punch times,
| which is exactly how the manual form already records an absence.
|
| `aliases` drives the auto-detection in `attendanceImportNormalize`. They are
| a starting guess and never a decision: the mapping step always renders the
| picker with the guess selected, so a file whose "Status" column means
| something else is corrected before anything is read out of it.
*/

export const IMPORT_FIELD = {
  EMPLOYEE_ID: "employeeId",
  DATE: "date",
  PUNCH_IN: "punchIn",
  PUNCH_OUT: "punchOut",
  STATUS: "status",
  REMARKS: "remarks",
};

export const IMPORT_FIELDS = [
  {
    key: IMPORT_FIELD.EMPLOYEE_ID,
    label: "Employee ID",
    required: true,
    hint: "Matched against the employee directory. Must already exist.",
    example: "EMP001",
    aliases: [
      "employeeid",
      "employeecode",
      "empid",
      "empcode",
      "employeenumber",
      "empno",
      "staffid",
      "staffcode",
      "personnelnumber",
      "employee",
    ],
  },
  {
    key: IMPORT_FIELD.DATE,
    label: "Date",
    required: true,
    hint: "The day the attendance belongs to.",
    example: "2024-08-15",
    aliases: [
      "date",
      "attendancedate",
      "punchdate",
      "workdate",
      "day",
      "dated",
      "transactiondate",
      "logdate",
    ],
  },
  {
    key: IMPORT_FIELD.PUNCH_IN,
    label: "Punch In",
    required: false,
    hint: "Time the employee arrived. Left empty for an absence or a leave.",
    example: "09:30 AM",
    aliases: [
      "punchin",
      "intime",
      "checkin",
      "timein",
      "clockin",
      "firstin",
      "startime",
      "starttime",
      "shiftin",
      "in",
    ],
  },
  {
    key: IMPORT_FIELD.PUNCH_OUT,
    label: "Punch Out",
    required: false,
    hint: "Time the employee left.",
    example: "06:30 PM",
    aliases: [
      "punchout",
      "outtime",
      "checkout",
      "timeout",
      "clockout",
      "lastout",
      "endtime",
      "shiftout",
      "out",
    ],
  },
  {
    key: IMPORT_FIELD.STATUS,
    label: "Status",
    required: false,
    hint: "Present, Absent, Leave, Half Day or Late. Derived from the punch in when left out.",
    example: "Present",
    aliases: [
      "status",
      "attendancestatus",
      "attendance",
      "dailystatus",
      "presentabsent",
      "markedas",
      "type",
    ],
  },
  {
    key: IMPORT_FIELD.REMARKS,
    label: "Remarks",
    required: false,
    hint: "Free text carried onto the record.",
    example: "Migrated from legacy payroll",
    aliases: [
      "remarks",
      "remark",
      "comment",
      "comments",
      "note",
      "notes",
      "reason",
      "description",
    ],
  },
];

export const REQUIRED_IMPORT_FIELDS = IMPORT_FIELDS.filter(
  (field) => field.required
);

export const getImportField = (key) =>
  IMPORT_FIELDS.find((field) => field.key === key) || null;

export const getImportFieldLabel = (key) =>
  getImportField(key)?.label || key;

/*
|--------------------------------------------------------------------------
| Date Formats
|--------------------------------------------------------------------------
| `01/02/2026` is the 1st of February to most of the world and the 2nd of
| January to the United States, and nothing in the file says which. Guessing
| it silently would file a whole migration a month out with no way of noticing,
| so the importer detects that it cannot tell and asks.
|
| AUTO is not "guess": it resolves the shapes that are unambiguous on their own
| - a four digit year, or a day past the twelfth - and reports the rest as
| ambiguous so the user picks one of the two explicit formats below.
*/

export const DATE_FORMAT = {
  AUTO: "auto",
  DMY: "DMY",
  MDY: "MDY",
  YMD: "YMD",
};

export const DATE_FORMAT_OPTIONS = [
  {
    value: DATE_FORMAT.AUTO,
    label: "Detect automatically",
    description: "Reads dates that can only mean one thing, and asks about the rest",
  },
  {
    value: DATE_FORMAT.DMY,
    label: "Day first (DD/MM/YYYY)",
    description: "15/08/2024 is the 15th of August",
  },
  {
    value: DATE_FORMAT.MDY,
    label: "Month first (MM/DD/YYYY)",
    description: "08/15/2024 is the 15th of August",
  },
  {
    value: DATE_FORMAT.YMD,
    label: "Year first (YYYY-MM-DD)",
    description: "2024-08-15 is the 15th of August",
  },
];

/*
|--------------------------------------------------------------------------
| Status Aliases
|--------------------------------------------------------------------------
| What another system's status column is allowed to say for each of ours.
|
| Compared after being lower cased and stripped of everything but letters, so
| "Half-Day", "HALF DAY" and "half_day" all arrive here as "halfday" and only
| the one spelling has to be listed.
|
| Anything not listed is *not* quietly turned into Present. It is collected and
| handed back to the mapping step, which asks the user which of our statuses it
| means - the one place a status can be decided is by somebody who knows what
| their old system called it.
*/

const STATUS_ALIASES = {
  [ATTENDANCE_STATUS.PRESENT]: [
    "p",
    "present",
    "pr",
    "prsnt",
    "working",
    "worked",
    "fullday",
    "full",
    "attended",
    "y",
    "yes",
    "1",
  ],
  [ATTENDANCE_STATUS.LATE]: [
    "l",
    "late",
    "latecoming",
    "latemark",
    "lc",
    "delayed",
    "presentlate",
  ],
  [ATTENDANCE_STATUS.ABSENT]: [
    "a",
    "absent",
    "ab",
    "abs",
    "notpresent",
    "nopunch",
    "lop",
    "losspay",
    "n",
    "no",
    "0",
  ],
  [ATTENDANCE_STATUS.LEAVE]: [
    "leave",
    "onleave",
    "lv",
    "cl",
    "sl",
    "el",
    "pl",
    "casualleave",
    "sickleave",
    "earnedleave",
    "paidleave",
    "approvedleave",
  ],
  [ATTENDANCE_STATUS.HALF_DAY]: [
    "hd",
    "halfday",
    "half",
    "hf",
    "halfdayleave",
    "halfpresent",
  ],
};

/*
| Flattened into `{ alias: status }` once at module load, so matching a status
| is a lookup rather than a walk through five arrays per row. On a hundred
| thousand row file that difference is the whole validation pass.
*/

export const STATUS_ALIAS_MAP = Object.entries(STATUS_ALIASES).reduce(
  (map, [status, aliases]) => {

    aliases.forEach((alias) => {
      map[alias] = status;
    });

    /*
    | The status itself is always its own alias, so a file that already speaks
    | our vocabulary needs no aliases listed at all.
    */
    map[status.toLowerCase().replace(/[^a-z0-9]/g, "")] = status;

    return map;

  },
  {}
);

/*
| The statuses a row may actually be imported as. `Holiday` and `Weekly Off`
| are deliberately absent: `attendanceConstants` documents both as derived for
| a day that has no record and never stored on one, so offering them here would
| let an import write a day every report is built to infer.
*/

export const IMPORTABLE_STATUSES = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.LATE,
  ATTENDANCE_STATUS.HALF_DAY,
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.LEAVE,
];

/*
| The statuses that describe a day nobody worked, so a missing punch time on
| one of them is normal rather than something to warn about. The same pair
| `attendanceUtils.isTimeOptionalStatus` already treats this way, kept in step
| with it deliberately.
*/

export const TIME_OPTIONAL_STATUSES = [
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.LEAVE,
];

/*
|--------------------------------------------------------------------------
| Import Modes
|--------------------------------------------------------------------------
| What to do about a day that already has a record.
|
| Skip is the default and is the only mode that cannot lose anything: a
| migration is normally run more than once - a first pass, a corrected file,
| the months that were missed - and a default of Replace would quietly
| overwrite the corrections made between the runs.
*/

export const IMPORT_MODE = {
  SKIP: "SKIP",
  REPLACE: "REPLACE",
};

export const IMPORT_MODE_OPTIONS = [
  {
    value: IMPORT_MODE.SKIP,
    label: "Skip existing records",
    description:
      "Days that already have attendance are left exactly as they are. Recommended.",
  },
  {
    value: IMPORT_MODE.REPLACE,
    label: "Replace existing records",
    description:
      "Days that already have attendance are overwritten by the file. This cannot be undone.",
  },
];

/*
|--------------------------------------------------------------------------
| Row Outcomes
|--------------------------------------------------------------------------
| What the preview sorts rows into. A row is exactly one of these, so the
| counts across the filters always add up to the total.
*/

export const ROW_OUTCOME = {
  NEW: "NEW",
  EXISTING: "EXISTING",
  DUPLICATE: "DUPLICATE",
  UNMATCHED: "UNMATCHED",
  INVALID: "INVALID",
  CONFLICT: "CONFLICT",
};

/*
|--------------------------------------------------------------------------
| Import Runs
|--------------------------------------------------------------------------
*/

export const IMPORT_STATUS = {
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
};

export const IMPORT_STATUS_BADGES = {
  [IMPORT_STATUS.PROCESSING]: "bg-blue-50 text-blue-700 ring-blue-200",
  [IMPORT_STATUS.COMPLETED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [IMPORT_STATUS.COMPLETED_WITH_ERRORS]:
    "bg-amber-50 text-amber-700 ring-amber-200",
  [IMPORT_STATUS.FAILED]: "bg-red-50 text-red-700 ring-red-200",
};

export const IMPORT_STATUS_LABELS = {
  [IMPORT_STATUS.PROCESSING]: "Processing",
  [IMPORT_STATUS.COMPLETED]: "Completed",
  [IMPORT_STATUS.COMPLETED_WITH_ERRORS]: "Completed with errors",
  [IMPORT_STATUS.FAILED]: "Failed",
};

/*
|--------------------------------------------------------------------------
| Limits
|--------------------------------------------------------------------------
| The import runs in the browser, so every limit here is a browser limit
| stated out loud rather than a number picked to look safe.
*/

/*
| One multi location update per batch. Realtime Database has no documented
| ceiling on the number of paths in an update, but the whole batch is one
| request that has to be built, serialised and acknowledged as a unit: too few
| paths and a large file becomes hundreds of round trips, too many and a slow
| connection times the request out and loses the whole batch's progress.
|
| Four hundred days is roughly a fortnight of a two hundred head company and
| serialises to well under a megabyte, which is the size a single write stays
| comfortable at.
*/

export const IMPORT_BATCH_SIZE = 400;

/*
| Rows above which the preview stops offering "select everything" style work
| and the page says plainly that it is a large import. Not a refusal - the
| import still runs - but a hundred thousand rows in a browser tab is worth
| saying out loud rather than discovering.
*/

export const LARGE_IMPORT_ROWS = 20000;

/*
| The point past which a browser based import stops being the right tool. The
| file is parsed, validated and held in memory in full, so this is a limit of
| the tab rather than of the database.
*/

export const MAX_IMPORT_ROWS = 100000;

export const MAX_FILE_SIZE_MB = 10;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/*
| CSV and Excel. The reader underneath is the same workbook reader the bulk
| on-boarding importer uses, so all three formats arrive here as the same grid
| of cells and nothing downstream knows which one it came from.
|
| A spreadsheet does carry two things a CSV cannot, and both are decided rather
| than ignored:
|
|   Multiple sheets   only the first is read, which is the same rule the bulk
|                     on-boarding importer states, and the upload screen says so
|                     before a file is picked.
|
|   Typed cells       a real date or time cell is a number, not text. Those are
|                     read as their serial and turned into a calendar day or a
|                     time of day by arithmetic that never touches a timezone -
|                     see `attendanceImportNormalize`.
|
| The two lists are kept together because they have to agree: the string is
| what the file picker filters on, and the array is what the size and type
| check actually enforces. A file picker filter is a convenience and not a
| guarantee - a drag and drop bypasses it entirely.
*/

export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export const ACCEPTED_IMPORT_TYPES = ACCEPTED_IMPORT_EXTENSIONS.join(",");

/*
| How many preview rows are rendered at once. The preview is paginated for the
| same reason the reports are: ten thousand rows in one table is a frozen tab.
*/

export const PREVIEW_PAGE_SIZE = 10;

/*
|--------------------------------------------------------------------------
| Wizard Steps
|--------------------------------------------------------------------------
| Declared here rather than in the page so the progress indicator, the guards
| between steps and the back button all read the same list.
*/

export const IMPORT_STEP = {
  UPLOAD: "upload",
  MAP: "map",
  MATCH: "match",
  VALIDATE: "validate",
  PREVIEW: "preview",
  IMPORTING: "importing",
  COMPLETE: "complete",
};

export const IMPORT_STEPS = [
  { key: IMPORT_STEP.UPLOAD, label: "Upload" },
  { key: IMPORT_STEP.MAP, label: "Map" },
  { key: IMPORT_STEP.MATCH, label: "Match" },
  { key: IMPORT_STEP.VALIDATE, label: "Validate" },
  { key: IMPORT_STEP.PREVIEW, label: "Preview" },
  { key: IMPORT_STEP.COMPLETE, label: "Import" },
];
