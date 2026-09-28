import * as XLSX from "xlsx";

import {
    BULK_ONBOARD_COLUMNS,
    REQUIRED_BULK_ONBOARD_COLUMNS,
    matchHeader,
} from "./bulkOnboardColumns";

/*
|--------------------------------------------------------------------------
| Read Bulk On-boarding File
|--------------------------------------------------------------------------
| Turns the workbook the user picked into plain rows the validator can read.
| Nothing is judged here beyond the shape of the sheet itself: this step is
| only responsible for finding the heading row, mapping the headings onto
| our columns and handing every cell back as a trimmed string.
|
| Row numbers are the ones printed down the side of Excel, because an error
| the user cannot find in their own file is not much of an error message.
|--------------------------------------------------------------------------
*/

export const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv";

const pad = (value) => String(value).padStart(2, "0");

const toDateString = (year, month, day) =>
    `${year}-${pad(month)}-${pad(day)}`;

/*
| A joining date reaches us in whichever shape the sheet stored it: the
| serial number behind a real date cell, or text somebody typed. Both are
| brought to the YYYY-MM-DD the rest of the app writes and validates.
|
| The serial is deliberately read as a number rather than as a `Date`. A
| date cell holds a day, not an instant, and turning it into a `Date` first
| pins it to a moment in UTC that a browser east or west of Greenwich then
| reads back as the day before or after. The arithmetic below never leaves
| the calendar, so the day in the sheet is the day we store.
|
| Text that matches none of the accepted shapes is handed back untouched so
| the validator can reject it by name rather than silently blanking a cell.
*/
const normalizeDate = (value) => {

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return toDateString(
            value.getUTCFullYear(),
            value.getUTCMonth() + 1,
            value.getUTCDate()
        );
    }

    if (typeof value === "number" && Number.isFinite(value)) {

        const parsed = XLSX.SSF.parse_date_code(value);

        if (parsed) {
            return toDateString(parsed.y, parsed.m, parsed.d);
        }

        return "";
    }

    const text = String(value ?? "").trim();

    if (!text) {
        return "";
    }

    // Already the shape we store.
    const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

    if (iso) {
        return toDateString(iso[1], Number(iso[2]), Number(iso[3]));
    }

    // Day first, the way an Indian sheet is usually typed.
    const dayFirst = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

    if (dayFirst) {
        return toDateString(dayFirst[3], Number(dayFirst[2]), Number(dayFirst[1]));
    }

    return text;
};

/*
| Excel keeps a mobile number typed as digits as a number and one typed with
| a leading zero or a space as text, so every cell is flattened to a trimmed
| string before anyone looks at it.
*/
const toText = (value) => {

    if (value === null || value === undefined) {
        return "";
    }

    if (value instanceof Date) {
        return normalizeDate(value);
    }

    return String(value).trim();
};

export const readBulkOnboardFile = async (file) => {

    const buffer = await file.arrayBuffer();

    // No `cellDates`: date cells are wanted as their serial number, which
    // `normalizeDate` turns into a calendar day without a timezone in sight.
    const workbook = XLSX.read(buffer, {
        type: "array",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        return {
            success: false,
            message: "This file has no sheets in it.",
        };
    }

    /*
    | `header: 1` keeps the sheet as a grid rather than guessing at headings,
    | which is what lets the heading row be found by matching and lets every
    | row keep the number it has in Excel.
    */
    const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        blankrows: true,
        raw: true,
    });

    const isEmptyRow = (row = []) =>
        row.every((cell) => !String(cell ?? "").trim());

    const headingIndex = grid.findIndex(
        (row) => Array.isArray(row) && !isEmptyRow(row)
    );

    if (headingIndex === -1) {
        return {
            success: false,
            message: "This file is empty.",
        };
    }

    const headings = grid[headingIndex];

    /* Which column of the sheet each of our fields was found in. */
    const columnIndexes = {};

    const unknownHeadings = [];

    headings.forEach((heading, index) => {

        const text = String(heading ?? "").trim();

        if (!text) {
            return;
        }

        const key = matchHeader(text);

        if (!key) {
            unknownHeadings.push(text);
            return;
        }

        // First heading wins, so a duplicated column cannot shadow the data.
        if (!(key in columnIndexes)) {
            columnIndexes[key] = index;
        }

    });

    const missingColumns = REQUIRED_BULK_ONBOARD_COLUMNS
        .filter((column) => !(column.key in columnIndexes))
        .map((column) => column.label);

    if (missingColumns.length) {
        return {
            success: false,
            message: `The file is missing ${missingColumns.length === 1 ? "a required column" : "required columns"}: ${missingColumns.join(", ")}.`,
            missingColumns,
        };
    }

    const rows = [];

    for (let index = headingIndex + 1; index < grid.length; index += 1) {

        const row = grid[index] || [];

        if (isEmptyRow(row)) {
            continue;
        }

        const values = {};

        BULK_ONBOARD_COLUMNS.forEach((column) => {

            const cellIndex = columnIndexes[column.key];

            const cell =
                cellIndex === undefined ? "" : row[cellIndex];

            values[column.key] =
                column.key === "joiningDate"
                    ? normalizeDate(cell)
                    : toText(cell);

        });

        rows.push({
            // The number printed down the side of the sheet, not the array index.
            rowNumber: index + 1,
            values,
        });

    }

    if (!rows.length) {
        return {
            success: false,
            message: "The file has headings but no employee rows.",
        };
    }

    return {
        success: true,
        rows,
        unknownHeadings,
        sheetName,
    };

};

export default readBulkOnboardFile;
