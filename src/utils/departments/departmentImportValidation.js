import { validateField } from "../validation/validateField";
import {
  IMPORT_FIELD,
  IMPORT_FIELDS,
  ROW_OUTCOME,
} from "./departmentImportConstants";

/*
|--------------------------------------------------------------------------
| Department Import - Validation
|--------------------------------------------------------------------------
| Every judgement made about a row, in the order the wizard makes them:
|
|   autoDetectMapping      a first guess at which column is which
|   buildImportRows        what the file says, read through the mapping
|   resolveImportRows      what each row would actually do to the organisation
|   buildImportPlan        the departments and designations that get written
|   summarizeImportRows    the counts the preview and the confirmation show
|
| Pure throughout - no Firebase, no React. The service fetches, this file
| decides, and the same decision is therefore re-run in the preview, in the
| confirmation and in the service before a write without any chance of the
| three disagreeing.
|
| The shape mirrors `attendanceImportValidation` on purpose, with one
| structural difference that runs through the whole file: an attendance row is
| independent of the rows around it, and a department row is not. A file's
| third row can only be understood once its first two have been read, because
| by then "Engineering" may already be a department this same import is about
| to create. So the resolution below is a single ordered walk that carries what
| the rows before it have claimed, rather than a set of passes that could each
| be run on their own.
|
| Errors stop a row. Warnings do not: they are things worth knowing that are
| not reasons to refuse a structure - a department that already exists, a name
| that differs from the stored one only in its punctuation.
|--------------------------------------------------------------------------
*/

const addError = (row, message) => {
  row.errors.push(message);
};

const addWarning = (row, message) => {
  row.warnings.push(message);
};

/*
|--------------------------------------------------------------------------
| Names
|--------------------------------------------------------------------------
| Two functions, and the difference between them is the whole matching model.
|
| `toDisplayName` is what gets stored: trimmed, with runs of whitespace
| collapsed, and otherwise exactly what the user typed. Case included - if
| their file says "Human Resources" that is what the department is called.
|
| `toMatchKey` is what gets compared: lower cased with everything but letters
| and digits removed. Departments are keyed in the database by a push id rather
| than by their name, so "already exists" can only ever be a question about
| names, and it has to be asked the way a person would ask it. "HR", "H.R." and
| "hr" are one department, and a file that lists two of those spellings is
| listing one department twice rather than introducing a second.
|
| This is the same comparison `Departments.jsx` already makes before it lets
| the Add Department form save, widened from case to punctuation.
*/

export const toDisplayName = (value = "") =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const toMatchKey = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/*
|--------------------------------------------------------------------------
| Auto-detection
|--------------------------------------------------------------------------
| A first guess at which column is which, from the headings alone. Exact alias
| matches are claimed first across every field, then the leftovers are offered
| to a substring match, so a file with both "Department" and "Sub Department"
| gives the exact one to the field that names it.
|
| A guess and never a decision: the mapping step renders every field as a
| picker with this filled in, and the user corrects it before anything is read.
| The same shape as the attendance importer's, deliberately.
*/

export const autoDetectMapping = (headers = []) => {

  const mapping = {};

  const claimed = new Set();

  const usable = headers.filter((header) => !header.blank);

  IMPORT_FIELDS.forEach((field) => {

    const exact = usable.find(
      (header) =>
        !claimed.has(header.index) && field.aliases.includes(header.key)
    );

    if (exact) {
      mapping[field.key] = exact.index;
      claimed.add(exact.index);
    }

  });

  IMPORT_FIELDS.forEach((field) => {

    if (mapping[field.key] !== undefined) return;

    /*
    | Longest alias first, so "designationname" is tried before "name" and a
    | column called "Designation Name" is not claimed by the shortest alias
    | that happens to be a substring of it.
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
| The Existing Structure
|--------------------------------------------------------------------------
| The departments already in the database, turned into something a row can be
| looked up in.
|
| A `Map` keyed by the match key, holding the department's real id, the name as
| it is actually stored, and its designations keyed the same way. Building it
| once means the resolution below is a lookup per row rather than a scan of the
| whole organisation per row, and - more importantly - it is the only place the
| database's shape is read, so nothing downstream has to know that a department
| is a push id holding a `name` and a `designations` object.
|
| Two stored departments whose names fold to the same key is not a state this
| product can produce - the Add Department form already refuses a name that
| matches an existing one - but if one ever existed the first is kept, so an
| import merges into a real department rather than creating a third.
*/

export const buildDepartmentIndex = (departments = {}) => {

  const byKey = new Map();

  Object.entries(departments || {}).forEach(([departmentId, department]) => {

    const name = toDisplayName(department?.name);

    const key = toMatchKey(name);

    if (!key || byKey.has(key)) return;

    const designations = new Map();

    Object.entries(department?.designations || {}).forEach(
      ([designationId, designation]) => {

        const designationName = toDisplayName(designation?.name);

        const designationKey = toMatchKey(designationName);

        if (!designationKey || designations.has(designationKey)) return;

        designations.set(designationKey, {
          id: designationId,
          name: designationName,
        });

      }
    );

    byKey.set(key, {
      id: departmentId,
      name,
      designations,
    });

  });

  return byKey;

};

/*
|--------------------------------------------------------------------------
| Step One - Read The File Through The Mapping
|--------------------------------------------------------------------------
| The raw cells become a row with a department name, an optional designation
| name and a match key for each, plus everything that could not be read.
|
| `source` keeps every mapped cell exactly as it appeared in the file. The
| error report is built from it, and a report that showed the value the
| importer derived rather than the value the user typed would send them looking
| for something that is not in their file.
|
| What is deliberately *not* checked here is whether a name is one the product
| would let somebody type. That question belongs to the next stage, because the
| answer only matters for a name that is about to be created: a company that
| already has an "R&D" department should be able to import a file that says
| "R&D" and have its roles added, and refusing the row for a punctuation rule
| about creating departments would block a row that creates nothing.
|
| Two things are checked, and both are about whether the row can be used at
| all rather than about what it says.
*/

export const buildImportRows = ({ rows = [], mapping = {} }) => {

  const cellAt = (cells, field) => {

    const index = mapping[field];

    if (index === undefined || index === null) return "";

    return cells[index] ?? "";

  };

  return rows.map((row) => {

    const source = {
      department: cellAt(row.cells, IMPORT_FIELD.DEPARTMENT),
      designation: cellAt(row.cells, IMPORT_FIELD.DESIGNATION),
    };

    const department = toDisplayName(source.department);

    const designation = toDisplayName(source.designation);

    const result = {

      rowNumber: row.rowNumber,

      source,

      department,
      departmentKey: toMatchKey(department),

      designation,
      designationKey: toMatchKey(designation),

      /* Filled in by `resolveImportRows`. */
      departmentExists: false,
      existingDepartmentId: "",
      existingDepartmentName: "",
      designationExists: false,

      createsDepartment: false,
      createsDesignation: false,

      isDuplicate: false,

      errors: [],
      warnings: [],

    };

    /*
    |----------------------------------------------------------------------
    | Department
    |----------------------------------------------------------------------
    | Required, because it is the node everything else in the row hangs off.
    | A designation with no department has nowhere to be created.
    */

    if (!department) {

      addError(result, "Department is missing.");

    } else if (!result.departmentKey) {

      /*
      | A cell with something in it that reduces to nothing once it is folded
      | for matching - punctuation, symbols, a stray dash. It cannot be matched
      | to a department and cannot become one, so there is nothing this row
      | could mean.
      */
      addError(
        result,
        `"${department}" has no letters or digits in it, so it cannot be a department name.`
      );

    }

    /*
    |----------------------------------------------------------------------
    | Designation
    |----------------------------------------------------------------------
    | Optional. An empty designation cell is a row that says "this department
    | exists", which is a real thing for a file to say.
    */

    if (designation && !result.designationKey) {
      addError(
        result,
        `"${designation}" has no letters or digits in it, so it cannot be a designation name.`
      );
    }

    return result;

  });

};

/*
|--------------------------------------------------------------------------
| Step Two - What Each Row Would Actually Do
|--------------------------------------------------------------------------
| One ordered walk, carrying what the rows before it have already claimed.
|
| This is where a department file stops resembling an attendance file. Two rows
| reading "Engineering, Backend Developer" and "Engineering, QA Engineer" are
| not two departments: the first creates Engineering and the second finds it
| already being created and only adds a role to it. Which row creates it is
| the order they appear in the file, because that is the only order the user
| can see.
|
| Four things are decided per row and they are decided in this order:
|
|   does the department already exist    against the index, by match key
|   does this row create it              only the first row to mention a
|                                        department that does not exist
|   is this pair already in the file     the same department and designation
|                                        twice, which is stopped
|   does the designation already exist   against that department's own list
|
| The name rules are applied here rather than when the row was read, and only
| to a name that is about to be created. `validateField` is the same function
| the Add Department and Add Designation forms call against the same rules, so
| a department this importer creates is exactly one somebody could have typed -
| while a department that already exists is matched and added to whatever it is
| called, because refusing to merge into a name the company is already using
| would be enforcing a rule about creating things against a row that creates
| nothing.
|
| `index` is the `Map` `buildDepartmentIndex` produced. Passing an empty one is
| meaningful rather than a mistake - it simply reports every row as new - but
| the screen never does: the departments are read before the rows are judged,
| so what it shows is measured against what the company actually has.
*/

export const resolveImportRows = (rows = [], { index = new Map() } = {}) => {

  /* Departments this file is creating, and the row that first named each. */
  const claimedDepartments = new Map();

  /* Every department-and-designation pair the file has already used. */
  const seenPairs = new Map();

  rows.forEach((row) => {

    if (!row.departmentKey) return;

    const existing = index.get(row.departmentKey);

    if (existing) {

      row.departmentExists = true;

      row.existingDepartmentId = existing.id;

      row.existingDepartmentName = existing.name;

      /*
      | The file spells an existing department differently. It is matched and
      | merged into all the same, and the stored name is left alone: an import
      | adds, and renaming a department is a deliberate act on the Departments
      | screen where somebody can see what they are renaming.
      */
      if (existing.name !== row.department) {
        addWarning(
          row,
          `Matched your existing department "${existing.name}". Its name is left as it is - an import never renames.`
        );
      }

    } else if (!claimedDepartments.has(row.departmentKey)) {

      /*
      | The first row to name a department that does not exist is the row that
      | creates it, and its spelling is the one the department gets - so this
      | is the row, and the only row, where the name has to be one the Add
      | Department form would have accepted.
      */

      const nameError = validateField("departmentName", row.department);

      if (nameError) {

        addError(row, `Department "${row.department}": ${nameError}`);

        return;

      }

      claimedDepartments.set(row.departmentKey, row.rowNumber);

      row.createsDepartment = true;

    }

    /*
    | A row with no designation is keyed as `department|`, so two rows naming
    | only the same department are caught as the duplicate they are, while a
    | department-only row followed by a row giving it a role is not.
    */
    const pairKey = `${row.departmentKey}|${row.designationKey}`;

    const firstRow = seenPairs.get(pairKey);

    if (firstRow !== undefined) {

      row.isDuplicate = true;

      /*
      | Marked rather than written twice. A department created twice would be
      | two departments with the same name, and a designation added twice would
      | be two identical options in the same picker - neither is something the
      | database would refuse, which is exactly why it is caught here.
      */
      row.createsDepartment = false;

      addError(
        row,
        row.designation
          ? `Row ${firstRow} already has "${row.designation}" in ${row.department}.`
          : `Row ${firstRow} already has the department ${row.department}.`
      );

      return;

    }

    seenPairs.set(pairKey, row.rowNumber);

    if (!row.designationKey) {

      /*
      | A department-only row for a department that is not being created is a
      | row with nothing to do. Not an error - a file that lists its
      | departments and then lists them again with roles is a perfectly ordinary
      | export - but worth saying, so the count of rows that change nothing is
      | never a silent one.
      */
      if (!row.createsDepartment) {
        addWarning(
          row,
          `${row.department} already exists and this row adds no designation to it.`
        );
      }

      return;

    }

    const existingDesignation = existing?.designations.get(row.designationKey);

    if (existingDesignation) {

      row.designationExists = true;

      row.existingDesignationName = existingDesignation.name;

      addWarning(
        row,
        `${existingDesignation.name} already exists in ${existing.name} and is left as it is.`
      );

      return;

    }

    /*
    | This designation is about to be created, so - as with the department
    | above - this is where its name has to be one the Add Designation form
    | would have accepted. A designation that already exists never reaches
    | here, which is what lets a file merge into roles the company created
    | before these rules were being applied.
    */

    const nameError = validateField("designationName", row.designation);

    if (nameError) {

      addError(row, `Designation "${row.designation}": ${nameError}`);

      return;

    }

    row.createsDesignation = true;

  });

  return rows;

};

/*
|--------------------------------------------------------------------------
| Outcomes
|--------------------------------------------------------------------------
| Exactly one outcome per row, decided in order of how much it matters, so the
| filters on the preview always add up to the total.
|
| A row that creates a department may create a designation underneath it at the
| same time, and is labelled by the larger of the two. That is a label and not
| a count: the numbers on the validate screen come from the plan below, which
| counts both.
*/

export const getRowOutcome = (row) => {

  if (row.isDuplicate) return ROW_OUTCOME.DUPLICATE;

  if (row.errors.length > 0) return ROW_OUTCOME.INVALID;

  if (row.createsDepartment) return ROW_OUTCOME.NEW_DEPARTMENT;

  if (row.createsDesignation) return ROW_OUTCOME.NEW_DESIGNATION;

  return ROW_OUTCOME.EXISTING;

};

export const isImportable = (row) => {

  const outcome = getRowOutcome(row);

  return (
    outcome === ROW_OUTCOME.NEW_DEPARTMENT ||
    outcome === ROW_OUTCOME.NEW_DESIGNATION
  );

};

/*
|--------------------------------------------------------------------------
| Step Three - The Plan
|--------------------------------------------------------------------------
| The rows folded back into the shape the database actually holds: a list of
| departments, each with the designations this import adds to it.
|
| Built rather than written straight from the rows because the file is flat and
| the database is not. Ten rows of "Engineering, <role>" are one department node
| and ten designation nodes underneath it, and a service writing row by row
| would create the department ten times.
|
| This is also what the preview renders and what the confirmation counts, so
| the tree somebody approves is the same object the service walks - there is no
| second derivation that could disagree with the first.
*/

export const buildImportPlan = (rows = []) => {

  const plan = new Map();

  rows.forEach((row) => {

    if (!isImportable(row)) return;

    let entry = plan.get(row.departmentKey);

    if (!entry) {

      entry = {
        key: row.departmentKey,
        /*
        | An existing department keeps its stored name. A new one takes the
        | spelling from the row that created it.
        */
        name: row.existingDepartmentName || row.department,
        departmentId: row.existingDepartmentId || "",
        isNew: !row.departmentExists,
        designations: [],
        rowNumbers: [],
      };

      plan.set(row.departmentKey, entry);

    }

    entry.rowNumbers.push(row.rowNumber);

    if (row.createsDesignation) {
      entry.designations.push({
        key: row.designationKey,
        name: row.designation,
      });
    }

  });

  return [...plan.values()];

};

/*
|--------------------------------------------------------------------------
| Reconciling A Plan Against The Database
|--------------------------------------------------------------------------
| The same plan, checked again against a fresh index and stripped of anything
| that now already exists.
|
| This is the guarantee that a department is never created twice, and it is
| deliberately a second check rather than a tidier version of the first. The
| plan the user approved was built from a read taken before they looked at the
| screen; by the time they press the button that read is old. Anything could
| have happened in between - somebody else adding the department on the
| Departments screen, the same file being imported in another tab, or the same
| button being pressed twice.
|
| So the service re-reads and calls this immediately before it writes, and the
| answer is the only plan that ever reaches the database:
|
|   a department that has appeared since   demoted from "create" to "add to",
|                                          keeping the name already stored
|   a designation that has appeared since  dropped
|   a department left with nothing to do   dropped entirely
|
| Pure and non-mutating: the rows keep the judgements the preview was drawn
| from, so re-running this never doubles up the messages on them.
*/

export const reconcilePlan = (plan = [], index = new Map()) =>
  plan
    .map((entry) => {

      const existing = index.get(entry.key);

      if (!existing) return entry;

      return {
        ...entry,
        /*
        | It exists now, whatever the preview said. The stored name wins - an
        | import never renames - and its id is where the designations go.
        */
        isNew: false,
        departmentId: existing.id,
        name: existing.name,
        designations: entry.designations.filter(
          (designation) => !existing.designations.has(designation.key)
        ),
      };

    })
    .filter((entry) => entry.isNew || entry.designations.length > 0);

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
| Every count the wizard shows, worked out in one pass over the rows rather
| than in six filters that would each walk the whole file.
|
| The two headline figures - departments and designations created - are read
| off the plan and not off the outcomes, because a single row can do both and
| an outcome can only say one thing.
|
| Everything else is counted by outcome, and that matters for one figure in
| particular. A duplicate row carries an error, so counting errors by "does
| this row have one" would put every duplicate into the error tally as well as
| the duplicate tally - and the validate screen, which adds the two together to
| say how many rows will not be imported, would report a number larger than the
| file has rows. Each row has exactly one outcome, so counting by outcome is
| what makes those two figures add up.
*/

export const summarizeImportRows = (rows = [], plan = []) => {

  const summary = {
    total: rows.length,
    valid: 0,
    warnings: 0,
    errors: 0,
    duplicates: 0,
    existing: 0,
    newDepartments: 0,
    newDesignations: 0,
    writes: 0,
    departments: 0,
    designations: 0,
    existingDepartments: 0,
  };

  const departments = new Set();

  const designations = new Set();

  const existingDepartments = new Set();

  rows.forEach((row) => {

    const outcome = getRowOutcome(row);

    if (row.warnings.length > 0) summary.warnings += 1;

    switch (outcome) {

      case ROW_OUTCOME.INVALID:
        summary.errors += 1;
        break;

      case ROW_OUTCOME.DUPLICATE:
        summary.duplicates += 1;
        break;

      case ROW_OUTCOME.EXISTING:
        summary.existing += 1;
        summary.valid += 1;
        break;

      default:
        summary.valid += 1;
        break;

    }

    /*
    | What the file was found to contain, which is only ever what could be read
    | out of it. A row whose name the importer refused is not a department the
    | file describes - counting it would put a number on the validate screen
    | that nothing else on the page adds up to.
    */
    if (outcome === ROW_OUTCOME.INVALID) return;

    if (row.departmentKey) departments.add(row.departmentKey);

    if (row.departmentKey && row.designationKey) {
      designations.add(`${row.departmentKey}|${row.designationKey}`);
    }

    if (row.departmentExists) existingDepartments.add(row.departmentKey);

  });

  plan.forEach((entry) => {

    if (entry.isNew) summary.newDepartments += 1;

    summary.newDesignations += entry.designations.length;

  });

  summary.writes = summary.newDepartments + summary.newDesignations;

  summary.departments = departments.size;

  summary.designations = designations.size;

  summary.existingDepartments = existingDepartments.size;

  return summary;

};

/*
|--------------------------------------------------------------------------
| Error Report
|--------------------------------------------------------------------------
| The rows that will not be imported, as the table `downloadCsv` writes.
|
| Every column holds the value as it appeared in the file, never the value the
| importer derived from it: the point of this file is to be opened beside the
| original and corrected, and a name the user never typed is no help at all.
*/

export const ERROR_REPORT_HEADER = [
  "Row Number",
  "Department",
  "Designation",
  "Outcome",
  "Errors",
  "Warnings",
];

const OUTCOME_LABELS = {
  [ROW_OUTCOME.NEW_DEPARTMENT]: "Creates the department",
  [ROW_OUTCOME.NEW_DESIGNATION]: "Adds a designation",
  [ROW_OUTCOME.EXISTING]: "Already exists - nothing to do",
  [ROW_OUTCOME.DUPLICATE]: "Duplicate row in this file",
  [ROW_OUTCOME.INVALID]: "Invalid",
};

export const getOutcomeLabel = (outcome) => OUTCOME_LABELS[outcome] || outcome;

const toReportRow = (row) => [
  row.rowNumber,
  row.source.department,
  row.source.designation,
  getOutcomeLabel(getRowOutcome(row)),
  row.errors.join(" | "),
  row.warnings.join(" | "),
];

/*
| Everything that will not be written and that somebody could do something
| about: the invalid rows and the duplicates. Rows that changed nothing only
| because the department or the designation is already there are left out -
| there is nothing to fix about those.
*/

export const buildErrorReport = (rows = []) =>
  rows
    .filter((row) => {

      const outcome = getRowOutcome(row);

      return (
        outcome === ROW_OUTCOME.INVALID || outcome === ROW_OUTCOME.DUPLICATE
      );

    })
    .map(toReportRow);

/*
| The rows a batch could not write, exported so the user can retry exactly
| those instead of re-importing a file they know most of succeeded.
*/

export const buildFailedReport = (rows = []) => rows.map(toReportRow);
