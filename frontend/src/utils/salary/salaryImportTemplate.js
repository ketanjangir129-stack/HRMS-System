import * as XLSX from "xlsx";
import {
    IMPORT_COLUMNS,
    IMPORT_GROUPS,
    POLICY_DRIVEN_KEYS,
    COLUMN_BY_KEY,
} from "./salaryImportColumns";

/*
|--------------------------------------------------------------------------
| Salary Import Template
|--------------------------------------------------------------------------
| The blank file somebody fills in and uploads back.
|
| It is built from the same column list the parser reads, so the sheet that is
| handed out and the sheet that is understood cannot drift apart.
|
| Two header rows, like the salary export: a merged band naming the sections -
| Employee Details, Earnings, Deductions - and the column names underneath.
| The parser finds the second one by looking for the Employee ID column rather
| than by counting rows, so the band above it is decoration the file can keep
| or lose.
|
| The sample row is filled in rather than left blank. An empty grid gives no
| clue what "Effective From" wants, and a row showing `2026-04-01` does.
|--------------------------------------------------------------------------
*/

const AMOUNT_FORMAT = "#,##0";

const SHEET_NAME = "Salary Import";

const NOTES_SHEET_NAME = "How To Fill";

// A required column is marked in its heading, which is where somebody looking
// at the file will be reading rather than in a legend they have to find.
const headingOf = (column) =>
    column.required
        ? `${column.label} *`
        : column.label;

/*
| The band row: each group's name in its first column and blanks across the
| rest, which is what the merge below then covers.
*/
const buildGroupRow = () => {

    const row = [];

    let previousGroup = null;

    IMPORT_COLUMNS.forEach((column) => {

        row.push(column.group === previousGroup ? "" : column.group);

        previousGroup = column.group;

    });

    return row;

};

/*
| Where each run of same-group columns starts and ends, so a band can be merged
| across exactly the columns it covers. Built by walking the list rather than
| written down, so adding a column to a group widens its band on its own.
*/
const buildGroupSpans = () => {

    const spans = [];

    IMPORT_COLUMNS.forEach((column, index) => {

        const last = spans[spans.length - 1];

        if (last && last.group === column.group) {
            last.end = index;
            return;
        }

        spans.push({ group: column.group, start: index, end: index });

    });

    return spans;

};

/*
| The second sheet: what every column wants, in the order the first sheet has
| them. It is a sheet rather than a row of cell comments because comments do
| not survive being opened in half the spreadsheet apps people use.
*/
const buildNotesRows = () => {

    const rows = [
        ["Column", "Required", "What to put in it"],
    ];

    IMPORT_COLUMNS.forEach((column) => {

        const required = column.required
            ? "Yes"
            : column.reference
                ? "No - reference only"
                : "No";

        let note = column.note || "";

        if (!note && column.kind === "amount") {
            note = column.readOnly
                ? "Calculated from your company's HR Policy - anything entered here is replaced"
                : "A monthly amount in rupees. Leave empty for none";
        }

        rows.push([column.label, required, note]);

    });

    rows.push([]);
    rows.push(["Notes"]);
    rows.push([
        "Employee ID must match an employee already on the register.",
    ]);
    rows.push([
        "An employee may only appear once in the file.",
    ]);
    rows.push([
        `${POLICY_DRIVEN_KEYS
            .map((key) => COLUMN_BY_KEY[key].label.replace(/\s*\(.*\)\s*$/, ""))
            .join(", ")} are priced by your company's HR Policy, not by this file.`,
    ]);
    rows.push([
        "Rows with errors are listed on screen and are not imported. Everything else is.",
    ]);

    return rows;

};

export const buildSalaryImportTemplate = () => {

    const groupRow = buildGroupRow();

    const headerRow = IMPORT_COLUMNS.map(headingOf);

    const sampleRow = IMPORT_COLUMNS.map((column) => column.sample ?? "");

    const sheet = XLSX.utils.aoa_to_sheet([
        groupRow,
        headerRow,
        sampleRow,
    ]);

    sheet["!merges"] = buildGroupSpans()
        // A band one column wide is merged down the two header rows instead of
        // across, so its name is not repeated over itself.
        .map((span) =>
            span.start === span.end
                ? {
                    s: { r: 0, c: span.start },
                    e: { r: 1, c: span.start },
                }
                : {
                    s: { r: 0, c: span.start },
                    e: { r: 0, c: span.end },
                }
        );

    sheet["!cols"] = headerRow.map((label) => ({
        wch: Math.max(16, label.length + 4),
    }));

    // The sample amounts are written as numbers so the column is a number
    // column the moment the file is opened.
    IMPORT_COLUMNS.forEach((column, index) => {

        if (column.kind !== "amount") return;

        const cell =
            sheet[XLSX.utils.encode_cell({ r: 2, c: index })];

        if (cell && cell.t === "n") {
            cell.z = AMOUNT_FORMAT;
        }

    });

    const notes = XLSX.utils.aoa_to_sheet(buildNotesRows());

    notes["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 70 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);

    XLSX.utils.book_append_sheet(workbook, notes, NOTES_SHEET_NAME);

    return XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    });

};

export const downloadSalaryImportTemplate = (
    fileName = "Salary-Import-Template.xlsx"
) => {

    const blob = new Blob([buildSalaryImportTemplate()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);

};

export { IMPORT_GROUPS };

export default downloadSalaryImportTemplate;
