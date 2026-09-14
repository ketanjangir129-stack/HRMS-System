import * as XLSX from "xlsx";
import { calculateSalary } from "./calculateSalary";
import { calculateStatutoryDeductions } from "./calculateStatutoryDeductions";
import {
    IMPORT_COLUMNS,
    COLUMN_BY_KEY,
    EARNING_KEYS,
    DEDUCTION_KEYS,
    REQUIRED_COLUMN_KEYS,
    resolveHeader,
} from "./salaryImportColumns";

/*
|--------------------------------------------------------------------------
| Salary Import - Reading & Checking
|--------------------------------------------------------------------------
| Turns an uploaded sheet into rows that are either ready to write or carrying
| the reasons they are not.
|
| Nothing here talks to the database and nothing here writes: it takes the
| file, the register and the HR Policy and returns a verdict on every row. The
| modal decides what to show and the service decides what to save, which is
| what lets the whole check run and be read before a single salary is touched.
|
| A row is never partly imported. It is either sound in full or it is an error
| in full, because half a salary structure is a wrong salary structure rather
| than an incomplete one.
|--------------------------------------------------------------------------
*/

export const MAX_IMPORT_ROWS = 1000;

// How far down the sheet we will look for the header row before giving up.
const HEADER_SEARCH_DEPTH = 15;

const isBlank = (value) =>
    value === null ||
    value === undefined ||
    String(value).trim() === "";

/*
| An amount as it may have been typed. Excel hands over a real number when the
| cell was one, but a pasted column arrives as text and carries whatever came
| with it - a rupee sign, thousands separators, a trailing space.
|
| Returns `null` for an empty cell, which the caller reads as "not filled in"
| rather than as zero, and `NaN` for something that is not a number at all.
*/
const toAmount = (value) => {

    if (isBlank(value)) return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : NaN;
    }

    const cleaned = String(value)
        .replace(/[₹,\s]/g, "")
        // "(500)" is how a sheet writes a negative, and it stays negative here
        // so the check below can reject it by name.
        .replace(/^\((.*)\)$/, "-$1");

    if (cleaned === "" || cleaned === "-") return NaN;

    const amount = Number(cleaned);

    return Number.isFinite(amount) ? amount : NaN;

};

const pad = (value) => String(value).padStart(2, "0");

const toDateString = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/*
| An effective date, however the sheet chose to hold it.
|
| Excel dates reach us as `Date` objects, a hand typed column reaches us as
| text, and a cell that was never formatted as a date reaches us as the serial
| number Excel counts days in. All three end up as YYYY-MM-DD, which is what
| the salary record stores.
|
| Returns `null` for an empty cell and `undefined` for something that is not a
| date, so the caller can tell "not filled in" from "not a date".
*/
const toEffectiveDate = (value) => {

    if (isBlank(value)) return null;

    if (value instanceof Date) {

        return Number.isNaN(value.getTime())
            ? undefined
            : toDateString(value);

    }

    if (typeof value === "number") {

        // Excel's day count. Guarded because an unformatted cell holding a
        // plain number is far more likely to be a mistake than a date.
        const parsed = XLSX.SSF?.parse_date_code?.(value);

        if (!parsed || !parsed.y) return undefined;

        return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;

    }

    const text = String(value).trim();

    // Already the stored format.
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (iso) {
        return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
    }

    /*
    | Day first, which is how a date is written by hand here. Read as month
    | first it would silently move an effective date by months rather than
    | fail, so the ambiguous ones are taken the way the people filling the
    | sheet in write them.
    */
    const dayFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    if (dayFirst) {

        const [, day, month, year] = dayFirst;

        if (Number(month) > 12) return undefined;

        return `${year}-${pad(month)}-${pad(day)}`;

    }

    return undefined;

};

const toStatus = (value) => {

    if (isBlank(value)) return "Active";

    const text = String(value).trim().toLowerCase();

    if (text === "active") return "Active";

    if (text === "inactive") return "Inactive";

    return undefined;

};

/*
|--------------------------------------------------------------------------
| Reading The File
|--------------------------------------------------------------------------
*/

/*
| The row the column names are on.
|
| It is searched for rather than assumed to be the first, because the template
| carries a merged band above it and an exported sheet carries one too. A row
| counts as the header once it names at least two columns we know and one of
| them is the Employee ID, which no band row does.
*/
const findHeaderRow = (matrix) => {

    const depth = Math.min(matrix.length, HEADER_SEARCH_DEPTH);

    for (let index = 0; index < depth; index += 1) {

        const keys = (matrix[index] || [])
            .map((cell) => resolveHeader(cell))
            .filter(Boolean);

        if (keys.length >= 2 && keys.includes("employeeId")) {
            return index;
        }

    }

    return -1;

};

/*
| The uploaded workbook as a list of `{ rowNumber, values }`, where `values` is
| keyed by our own column keys and `rowNumber` is the line in the spreadsheet
| the user is looking at - so an error can be reported against the row they
| would go and fix.
*/
export const readSalaryImportFile = async (file) => {

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error("This file has no sheets in it.");
    }

    const matrix = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        {
            header: 1,
            blankrows: false,
            defval: null,
        }
    );

    const headerIndex = findHeaderRow(matrix);

    if (headerIndex === -1) {
        throw new Error(
            "Could not find the column headings. Download the template and use its columns."
        );
    }

    const headers = matrix[headerIndex] || [];

    /*
    | Where each column we understand sits. A heading we do not recognise is
    | left out rather than guessed at, and reported separately so somebody who
    | renamed a column can see that it was ignored.
    */
    const columnAt = {};

    const unknownHeaders = [];

    headers.forEach((cell, index) => {

        if (isBlank(cell)) return;

        const key = resolveHeader(cell);

        if (!key) {
            unknownHeaders.push(String(cell).trim());
            return;
        }

        // A column repeated in the sheet is read from its first appearance.
        if (columnAt[key] === undefined) {
            columnAt[key] = index;
        }

    });

    const missingRequired = REQUIRED_COLUMN_KEYS
        .filter((key) => columnAt[key] === undefined)
        .map((key) => COLUMN_BY_KEY[key].label);

    if (missingRequired.length) {
        throw new Error(
            `The file is missing these columns: ${missingRequired.join(", ")}.`
        );
    }

    const rows = [];

    for (
        let index = headerIndex + 1;
        index < matrix.length;
        index += 1
    ) {

        const cells = matrix[index] || [];

        // A row where every column we read is empty is spacing, not data.
        const hasValue = IMPORT_COLUMNS.some((column) => {
            const at = columnAt[column.key];
            return at !== undefined && !isBlank(cells[at]);
        });

        if (!hasValue) continue;

        const values = {};

        IMPORT_COLUMNS.forEach((column) => {
            const at = columnAt[column.key];
            values[column.key] = at === undefined ? null : cells[at];
        });

        rows.push({
            // +1 because a spreadsheet counts its first row as 1, not 0.
            rowNumber: index + 1,
            values,
        });

    }

    return {
        sheetName,
        headerRowNumber: headerIndex + 1,
        unknownHeaders,
        presentKeys: Object.keys(columnAt),
        rows,
    };

};

/*
|--------------------------------------------------------------------------
| Checking A Row
|--------------------------------------------------------------------------
*/

/*
| Reads the amount columns of one band, collecting a complaint for every cell
| that is empty when it had to be filled in, is not a number, or is negative.
|
| An empty optional cell becomes 0 - a blank bonus column means no bonus. An
| empty *required* one does not: it is reported, because a missing basic salary
| is a column somebody forgot rather than an employee paid nothing.
*/
const readAmounts = (values, keys, errors) => {

    const amounts = {};

    keys.forEach((key) => {

        const column = COLUMN_BY_KEY[key];

        const raw = values[key];

        const amount = toAmount(raw);

        if (amount === null) {

            if (column.required) {
                errors.push(`${column.label} is empty.`);
            }

            amounts[key] = 0;

            return;

        }

        if (Number.isNaN(amount)) {
            errors.push(
                `${column.label} is not a number ("${String(raw).trim()}").`
            );
            amounts[key] = 0;
            return;
        }

        if (amount < 0) {
            errors.push(`${column.label} cannot be negative.`);
            amounts[key] = 0;
            return;
        }

        amounts[key] = amount;

    });

    return amounts;

};

/*
| Every check that can be made without writing anything, run over one row.
|
| The row is returned whether it passed or not - an import screen that dropped
| the bad rows would be telling somebody their file had errors while hiding
| which lines they were on.
*/
const checkRow = ({
    row,
    employees,
    assignedIds,
    policy,
    seenIds,
}) => {

    const { values, rowNumber } = row;

    const errors = [];

    /*
    | Upper cased, because that is how the register keys an employee - the
    | employee lookup upper cases before it reads, and onboarding upper cases
    | before it writes. A sheet typed in lower case is the same employee, and
    | reporting "emp001 is not on the register" would be a lie.
    */
    const employeeId = isBlank(values.employeeId)
        ? ""
        : String(values.employeeId).trim().toUpperCase();

    if (!employeeId) {
        errors.push("Employee ID is empty.");
    }

    const employee = employeeId ? employees[employeeId] : null;

    if (employeeId && !employee) {
        errors.push(
            `No employee with the ID "${employeeId}" is on the register.`
        );
    }

    /*
    | The same employee twice in one file. Both rows are refused rather than
    | the last one winning: which of the two amounts was meant is not
    | something the file says, and picking one silently would assign a salary
    | nobody chose.
    */
    if (employeeId && seenIds.has(employeeId)) {
        errors.push(
            `This employee appears more than once in the file (also on row ${seenIds.get(employeeId)}).`
        );
    }

    const earnings = readAmounts(values, EARNING_KEYS, errors);

    const imported = readAmounts(values, DEDUCTION_KEYS, errors);

    /*
    | The HR Policy prices PF, ESI, Professional Tax and Income Tax, exactly as
    | it does on the salary form. Whatever the file carried for those is
    | replaced, so an import cannot create a structure that disagrees with the
    | policy screen. A policy that is switched off returns `null` and its
    | column falls through to whatever was typed - an ordinary field.
    */
    const priced = policy
        ? calculateStatutoryDeductions({ earnings, policy })
        : {};

    const deductions = { ...imported };

    const pricedKeys = [];

    Object.entries(priced).forEach(([key, amount]) => {

        if (amount === null || amount === undefined) return;

        deductions[key] = amount;

        pricedKeys.push(key);

    });

    const status = toStatus(values.status);

    if (status === undefined) {
        errors.push(
            `Status must be Active or Inactive ("${String(values.status).trim()}").`
        );
    }

    /*
    | An effective date left empty falls back to the day the employee joined,
    | which is what the salary form fills in for a new structure. It is only an
    | error when there is nothing to fall back to.
    */
    const effectiveFrom = toEffectiveDate(values.effectiveFrom);

    let effective = effectiveFrom;

    if (effectiveFrom === undefined) {
        errors.push(
            `Effective From is not a date ("${String(values.effectiveFrom).trim()}"). Use YYYY-MM-DD.`
        );
        effective = "";
    }

    if (effectiveFrom === null) {

        const joiningDate = employee?.employmentInfo?.joiningDate || "";

        if (!joiningDate) {

            // Only worth saying when the employee is actually on the register;
            // an unknown ID has already been reported and has no joining date
            // by definition.
            if (employee) {
                errors.push(
                    "Effective From is empty and this employee has no joining date to fall back on."
                );
            }

            effective = "";

        }
        else {
            effective = joiningDate;
        }

    }

    const summary = calculateSalary(earnings, deductions);

    if (summary.grossSalary <= 0) {
        errors.push("The earnings add up to nothing.");
    }

    /*
    | Deductions larger than the pay they come out of. This is the check that
    | catches an annual figure typed into a monthly deduction column, and it is
    | worth refusing rather than saving a negative take home.
    */
    if (summary.grossSalary > 0 && summary.netSalary < 0) {
        errors.push(
            "The deductions come to more than the gross salary, so the net pay is negative."
        );
    }

    if (employeeId && !seenIds.has(employeeId)) {
        seenIds.set(employeeId, rowNumber);
    }

    return {

        rowNumber,

        employeeId,

        // Shown from the register where we have it, so the preview is checked
        // against who the employee actually is rather than against what the
        // file claimed.
        name:
            employee?.personalInfo?.name ||
            (isBlank(values.name) ? "" : String(values.name).trim()),

        department: employee?.employmentInfo?.department || "",

        designation: employee?.employmentInfo?.designation || "",

        earnings,

        deductions,

        pricedKeys,

        grossSalary: summary.grossSalary,

        totalDeduction: summary.totalDeduction,

        netSalary: summary.netSalary,

        effectiveFrom: effective,

        status: status || "Active",

        // Whether this would be a new structure or a revision of one that is
        // already assigned, which is what the "update existing" choice acts on.
        existing: Boolean(employeeId && assignedIds.has(employeeId)),

        errors,

        valid: errors.length === 0,

    };

};

/*
| Every row checked, in the order the file had them.
|
| `employees` is the register keyed by employee ID, `assignedIds` is who
| already has a structure, and `policy` is the company's HR Policy or `null`
| when it could not be read - in which case the four statutory deductions are
| taken from the file as typed rather than being priced against defaults
| nobody chose.
*/
export const buildImportRows = ({
    rows = [],
    employees = {},
    assignedIds = new Set(),
    policy = null,
}) => {

    const seenIds = new Map();

    return rows.map((row) =>
        checkRow({
            row,
            employees,
            assignedIds,
            policy,
            seenIds,
        })
    );

};

export default readSalaryImportFile;
