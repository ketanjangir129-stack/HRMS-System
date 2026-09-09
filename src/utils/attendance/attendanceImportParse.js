import * as XLSX from "xlsx";

import {
  ACCEPTED_IMPORT_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMPORT_ROWS,
} from "./attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Attendance Import - Parsing
|--------------------------------------------------------------------------
| Turns the file the user picked into a heading row and a list of raw rows.
|
| Nothing is judged here beyond the shape of the file itself. No column means
| anything yet, no date is read and no employee is looked for: this step only
| answers "what columns are in it and what is in each cell", because the
| mapping step has to be able to show the user a column before anybody can say
| what that column is.
|
| `xlsx` does the reading rather than a `split(",")` of our own. It is already
| a dependency - the bulk on-boarding importer reads its workbooks with it -
| and it already handles the four things a hand written splitter gets wrong:
| quoted fields, commas inside a quoted field, embedded newlines, and the three
| line endings a file can arrive with.
|
| It is also what lets a CSV and an `.xlsx` be the same feature rather than two.
| Both are read into the same grid of cells here, so the mapping, the
| validation and the writing underneath never learn which format the rows came
| out of. The only place the difference survives is the cell type: a CSV holds
| text and a spreadsheet can hold a real date or time, which is a number.
|
| Row numbers are the ones printed down the side of a spreadsheet, so an error
| message points at a row the user can actually find in their own file.
|--------------------------------------------------------------------------
*/

/*
| Every cell is flattened to a trimmed string, with one exception: a number is
| kept as a number.
|
| That exception is what lets a date or a time that came out of a spreadsheet
| as a serial - `45519`, or `0.395833` for 09:30 - still be read as the day or
| the time it stands for. Turning it into "45519" first would throw that away,
| and the normaliser could only reject it.
*/

const toCell = (value) => {

  if (value === null || value === undefined) return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) return value;

  return String(value).trim();

};

const isEmptyRow = (row = []) =>
  row.every((cell) => {

    if (typeof cell === "number") return false;

    return !String(cell ?? "").trim();

  });

/*
| A heading turned into the key the auto-detection compares on: lower cased
| with everything but letters and digits removed.
|
| "Employee ID", "employee_id", "EMPLOYEE-ID" and "Employee  Id" all reduce to
| "employeeid", so the aliases in the constants only have to list one spelling
| of each name rather than every way it could be punctuated.
*/

export const normalizeHeader = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/*
|--------------------------------------------------------------------------
| File Checks
|--------------------------------------------------------------------------
| Answered before the file is read at all, so a file that was never going to
| work is refused instantly instead of after a ten megabyte parse.
*/

export const validateImportFile = (file) => {

  if (!file) {
    return "Please choose a file to import.";
  }

  const name = String(file.name || "").toLowerCase();

  /*
  | Checked here as well as on the file input. The picker's `accept` filter is
  | a convenience and not a guarantee: a file dragged onto the drop zone never
  | passes through it.
  */
  const accepted = ACCEPTED_IMPORT_EXTENSIONS.some((extension) =>
    name.endsWith(extension)
  );

  if (!accepted) {
    return `Only ${ACCEPTED_IMPORT_EXTENSIONS.join(", ")} files can be imported. Export your attendance from your old system as a CSV or Excel file and try again.`;
  }

  if (file.size === 0) {
    return "This file is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is larger than ${MAX_FILE_SIZE_MB} MB. Split it into smaller files and import them one at a time.`;
  }

  return "";

};

export const formatFileSize = (bytes = 0) => {

  if (!bytes) return "0 KB";

  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;

  if (kb < 1024) return `${Math.round(kb)} KB`;

  return `${(kb / 1024).toFixed(1)} MB`;

};

/*
|--------------------------------------------------------------------------
| Read
|--------------------------------------------------------------------------
| Returns `{ success, headers, rows }` where a row is
| `{ rowNumber, cells: [] }` - the cells still in the file's own column order,
| because nothing has been mapped yet.
|
| `header: 1` keeps the sheet as a grid instead of letting `xlsx` guess at
| headings. That is what lets the heading row be found by looking for the first
| row with anything in it, and what lets every row keep the number it has in
| the file rather than an array index.
|
| `raw: true` and no `cellDates` are deliberate and match the bulk on-boarding
| reader: a date cell is wanted as its serial number, which the normaliser
| turns into a calendar day with arithmetic that never touches a timezone.
| Letting `xlsx` build a `Date` first pins the day to an instant in UTC that a
| browser east or west of Greenwich reads back as the day before or after -
| which for attendance is the whole point of the exercise.
*/

export const readAttendanceImportFile = async (file) => {

  const fileError = validateImportFile(file);

  if (fileError) {
    return { success: false, message: fileError };
  }

  let grid;

  try {

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });

    /*
    | The first sheet, and only the first sheet.
    |
    | A workbook can hold a dozen of them - one per month is the usual shape an
    | old payroll system exports - and picking one for the user would be
    | guessing at which. So the rule is stated on the upload screen instead:
    | the first sheet is what gets read, and a workbook that needs all twelve
    | is twelve imports or one sheet that has been combined first.
    |
    | A CSV always has exactly one, so this decision is invisible for CSV.
    */
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return {
        success: false,
        message: "This file has no sheets in it to read.",
      };
    }

    grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      blankrows: true,
      raw: true,
    });

  } catch (error) {

    console.error("Attendance import parse error:", error);

    return {
      success: false,
      message:
        "This file could not be read. Make sure it is a valid CSV or Excel file and is not password protected, then try again.",
    };

  }

  const headingIndex = grid.findIndex(
    (row) => Array.isArray(row) && !isEmptyRow(row)
  );

  if (headingIndex === -1) {
    return {
      success: false,
      message: "This file is empty.",
    };
  }

  /*
  | A heading that is blank still holds its place in the array, because the
  | cells underneath it are addressed by column position. It is given a name so
  | the mapping step can render it as something rather than as a gap.
  */

  const headers = grid[headingIndex].map((heading, index) => {

    const label = String(heading ?? "").trim();

    return {
      index,
      label: label || `Column ${index + 1}`,
      key: normalizeHeader(label),
      blank: !label,
    };

  });

  const rows = [];

  for (
    let index = headingIndex + 1;
    index < grid.length && rows.length <= MAX_IMPORT_ROWS;
    index += 1
  ) {

    const row = grid[index] || [];

    /*
    | A blank line in the middle of a file is a formatting artefact, not a row
    | somebody meant to import, so it is dropped here rather than carried all
    | the way to the preview as an empty row with six errors on it.
    */
    if (isEmptyRow(row)) continue;

    rows.push({
      rowNumber: index + 1,
      cells: headers.map((header) => toCell(row[header.index])),
    });

  }

  if (rows.length === 0) {
    return {
      success: false,
      message:
        "This file has column headings but no attendance rows underneath them.",
    };
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      success: false,
      message: `This file has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows, which is more than one import can safely hold in the browser. Split it by month or by department and import the parts.`,
      rowCount: rows.length,
    };
  }

  return {
    success: true,
    headers,
    rows,
  };

};

export default readAttendanceImportFile;
