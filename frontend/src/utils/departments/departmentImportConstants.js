/*
|--------------------------------------------------------------------------
| Department Import Constants
|--------------------------------------------------------------------------
| Everything the department importer repeats: the two columns a file is mapped
| onto, the outcomes a row can have, and the limits a browser based import runs
| within.
|
| Deliberately shaped like `attendanceImportConstants`, because the wizard it
| drives is the same wizard. What is missing from it is the point: there is no
| date format to resolve, no status vocabulary to translate and no employee
| directory to match against, so a department file can only be read one way and
| the two screens attendance needs for those questions do not exist here.
|
| The one rule that is not declared here is what a name is allowed to look
| like. That lives in `utils/validation/rules.js` under `departmentName` and
| `designationName`, and the validator calls it rather than restating it - an
| importer that accepted a name the Add Department form rejects would create
| departments nobody could have typed, and could never rename.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Fields
|--------------------------------------------------------------------------
| Two columns, of which only the department is required.
|
| A file of departments with no designations is a real file - it is what a
| company that has only ever kept a list of divisions exports - and it imports
| as departments with nothing under them, which is exactly what the Add
| Department button creates.
|
| `aliases` drives the auto-detection in the validator. They are a first guess
| and never a decision: the mapping step always renders a picker with the guess
| selected, so a "Title" column that means something else is corrected before
| anything is read out of it.
*/

export const IMPORT_FIELD = {
  DEPARTMENT: "department",
  DESIGNATION: "designation",
};

export const IMPORT_FIELDS = [
  {
    key: IMPORT_FIELD.DEPARTMENT,
    label: "Department",
    required: true,
    hint: "Matched against your existing departments by name, ignoring case.",
    example: "Engineering",
    aliases: [
      "department",
      "departmentname",
      "dept",
      "deptname",
      "division",
      "divisionname",
      "unit",
      "function",
      "team",
      "departement",
    ],
  },
  {
    key: IMPORT_FIELD.DESIGNATION,
    label: "Designation",
    required: false,
    hint: "The role inside that department. Leave the column out to import departments on their own.",
    example: "Backend Developer",
    aliases: [
      "designation",
      "designationname",
      "jobtitle",
      "title",
      "role",
      "position",
      "post",
      "jobrole",
      "grade",
    ],
  },
];

/*
|--------------------------------------------------------------------------
| Row Outcomes
|--------------------------------------------------------------------------
| What the preview sorts rows into. A row is exactly one of these, so the
| counts across the filters always add up to the total.
|
| The two "new" outcomes are kept apart rather than folded into a single NEW
| because they are different sizes of change. Creating a department adds a node
| to the organisation chart and appears in every department picker in the
| product; adding a designation to a department that already exists adds one
| option to one picker. Somebody approving an import should be able to see the
| first number on its own.
*/

export const ROW_OUTCOME = {
  NEW_DEPARTMENT: "NEW_DEPARTMENT",
  NEW_DESIGNATION: "NEW_DESIGNATION",
  EXISTING: "EXISTING",
  DUPLICATE: "DUPLICATE",
  INVALID: "INVALID",
};

/*
|--------------------------------------------------------------------------
| What Happens To What Already Exists
|--------------------------------------------------------------------------
| Nothing. There is no import mode here and that is a decision, not an
| omission.
|
| The attendance importer offers Skip and Replace because a day of attendance
| is a leaf: overwriting one loses that day and nothing else. A department is
| not a leaf. Employees carry their designation as a plain name string on
| `employmentInfo.designation` rather than as a reference, so a Replace mode
| that rewrote a department's designations from a file would leave every
| employee holding a designation their own department no longer offers - a
| break nothing in the product would report, and that only surfaces the next
| time somebody opens that employee's form and finds the field empty.
|
| So an import only ever adds. An existing department keeps its name, its
| manager, and every designation it already has, and gains the designations in
| the file that it does not. Renaming and deleting stay where they already are:
| on the Departments screen, one at a time, by somebody looking at what they
| are changing.
|
| The rule is enforced twice, and the second time is the one that counts. The
| screen checks the file against the departments it read when the file was
| picked; the service reads them again and reconciles the plan against that
| read on the near side of the write. A department that appeared in between - a
| colleague adding it, a second tab, the same button pressed twice - is found
| and merged into rather than created a second time.
*/

/*
|--------------------------------------------------------------------------
| Import Runs
|--------------------------------------------------------------------------
| The same four states an attendance run can end in, and the same badges, so
| the two history panels read identically.
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
| Far smaller than the attendance importer's, because the thing being imported
| is far smaller. An organisation chart is tens of departments and hundreds of
| roles; a file with five thousand rows in it is a file of employees that has
| been pointed at the wrong importer, and saying so is more useful than
| grinding through it.
*/

export const MAX_IMPORT_ROWS = 5000;

export const MAX_FILE_SIZE_MB = 5;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export const ACCEPTED_IMPORT_TYPES = ACCEPTED_IMPORT_EXTENSIONS.join(",");

/*
| One multi location update per batch, counted in paths rather than rows.
|
| A new department is one path and a new designation is one path, so a batch of
| a hundred is a hundred nodes in a single atomic write - comfortably inside a
| single request, and large enough that a normal organisation chart lands in
| one of them.
*/

export const IMPORT_BATCH_SIZE = 100;

/*
| There are no wizard steps declared here, and their absence is the design.
|
| The attendance importer needs seven of them because a file of days raises
| questions the file cannot answer - which way round its dates are, what its
| status words mean, whether its employee ids name anybody. A department file
| carries two columns of names and raises none of them, so picking the file
| does the whole job and the screen that shows the answer is the same screen
| the file was picked on. See `useDepartmentImport` for the phases it moves
| through on its own.
*/
