import * as XLSX from "xlsx";
import { EARNING_FIELDS } from "./salaryFields";

/*
|--------------------------------------------------------------------------
| Salary Excel Export
|--------------------------------------------------------------------------
| The sheet carries two header rows: a grouped band (Employee Details /
| Earnings / Gross Salary / Deductions Applicable) merged over the columns
| it covers, and the column names themselves underneath it.
*/

const EMPLOYEE_COLUMNS = [
    { label: "Employee ID", value: (employee) => employee.employeeId },
    { label: "Name", value: (employee) => employee.name },
    { label: "Department", value: (employee) => employee.department },
    { label: "Designation", value: (employee) => employee.designation },
];

/*
| The deduction band reports whether a component applies to the employee,
| not what it costs, so a structure carrying an amount for it reads "Yes".
| Medical insurance is not a field on the salary form yet - the aliases let
| the column report itself the moment a record starts carrying one.
*/
const DEDUCTION_COLUMNS = [
    { label: "PF", keys: ["pf"] },
    { label: "ESI", keys: ["esi"] },
    { label: "Medical Insurance", keys: ["medicalInsurance", "medical"] },
];

const EMPLOYEE_SPAN = EMPLOYEE_COLUMNS.length;
const EARNING_SPAN = EARNING_FIELDS.length;
const DEDUCTION_SPAN = DEDUCTION_COLUMNS.length;

/*
| The date a structure took effect belongs to the salary record rather than to
| the employee, so it sits in a band of its own between the two.
*/
const EFFECTIVE_INDEX = EMPLOYEE_SPAN;
const EARNINGS_INDEX = EFFECTIVE_INDEX + 1;

// column index the single-column "Gross Salary" band sits at
const GROSS_INDEX = EARNINGS_INDEX + EARNING_SPAN;

const AMOUNT_FORMAT = "#,##0";
const DATE_FORMAT = "dd-mmm-yyyy";

const band = (label, span) => [
    label,
    ...Array(span - 1).fill(""),
];

const GROUP_ROW = [
    ...band("Employee Details", EMPLOYEE_SPAN),
    "Effective From",
    ...band("Earnings", EARNING_SPAN),
    "Gross Salary",
    ...band("Deductions", DEDUCTION_SPAN),
];

const HEADER_ROW = [
    ...EMPLOYEE_COLUMNS.map((column) => column.label),
    "Effective From",
    ...EARNING_FIELDS.map((field) => field.label),
    "Gross Salary",
    ...DEDUCTION_COLUMNS.map((column) => column.label),
];

const merge = (row, startColumn, endColumn, endRow = row) => ({
    s: { r: row, c: startColumn },
    e: { r: endRow, c: endColumn },
});

const isApplicable = (deductions, keys) =>
    keys.some((key) => Number(deductions[key] || 0) > 0)
        ? "Yes"
        : "No";

/*
| Effective dates are stored as YYYY-MM-DD. They are written to the sheet as
| real dates rather than text, so the column can be sorted, filtered and
| grouped by month once the file is open. A value that does not parse is left
| as it was recorded instead of being dropped.
*/
const toEffectiveDate = (value) => {

    if (!value) {
        return "—";
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "—" : value;
    }

    const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!parts) {
        return String(value);
    }

    // built from the parts so the date is read in local time, not UTC
    return new Date(
        Number(parts[1]),
        Number(parts[2]) - 1,
        Number(parts[3])
    );

};

// today's date in YYYY-MM-DD, so exports sort by name
const getToday = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
};

/*
| Employees are exported in the order the screen shows them, which keeps the
| file in step with the filters that are applied. An employee with no salary
| structure still gets a row - with the amount columns left empty rather than
| filled with zeroes, which would read as "assigned, but nil".
*/
export const buildSalaryRows = (employees = [], salaries = []) => {

    const salaryByEmployee = {};

    salaries.forEach((salary) => {
        salaryByEmployee[salary.employeeId] = salary;
    });

    return employees.map((employee) => {

        const salary = salaryByEmployee[employee.employeeId];

        const earnings = salary?.earnings || {};
        const deductions = salary?.deductions || {};

        return [

            ...EMPLOYEE_COLUMNS.map(
                (column) => column.value(employee) || "—"
            ),

            salary
                ? toEffectiveDate(salary.effectiveFrom)
                : "—",

            ...EARNING_FIELDS.map((field) =>
                salary
                    ? Number(earnings[field.name] || 0)
                    : ""
            ),

            salary
                ? Number(salary.grossSalary || 0)
                : "",

            ...DEDUCTION_COLUMNS.map((column) =>
                isApplicable(deductions, column.keys)
            ),

        ];

    });

};

export const buildSalaryWorkbook = (employees = [], salaries = []) => {

    const rows = buildSalaryRows(employees, salaries);

    const sheet = XLSX.utils.aoa_to_sheet([
        GROUP_ROW,
        HEADER_ROW,
        ...rows,
    ]);

    sheet["!merges"] = [
        merge(0, 0, EMPLOYEE_SPAN - 1),
        // the single-column bands run down both header rows instead of across
        merge(0, EFFECTIVE_INDEX, EFFECTIVE_INDEX, 1),
        merge(0, EARNINGS_INDEX, GROSS_INDEX - 1),
        merge(0, GROSS_INDEX, GROSS_INDEX, 1),
        merge(0, GROSS_INDEX + 1, GROSS_INDEX + DEDUCTION_SPAN),
    ];

    sheet["!cols"] = HEADER_ROW.map((label) => ({
        wch: Math.max(14, label.length + 2),
    }));

    // amounts are written as numbers so the sheet can total them
    rows.forEach((_, index) => {

        const rowIndex = index + 2;

        const dateCell =
            sheet[
                XLSX.utils.encode_cell({ r: rowIndex, c: EFFECTIVE_INDEX })
            ];

        // a date reaches the sheet as a serial number, so it is formatted
        // before the amount pass claims it
        if (dateCell && dateCell.t === "n") {
            dateCell.z = DATE_FORMAT;
        }

        for (let column = EARNINGS_INDEX; column <= GROSS_INDEX; column += 1) {

            const cell =
                sheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })];

            if (cell && cell.t === "n") {
                cell.z = AMOUNT_FORMAT;
            }

        }

    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        "Salary Details"
    );

    return XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    });

};

export const exportSalariesToExcel = (
    employees = [],
    salaries = [],
    fileName = `Salary-Details-${getToday()}.xlsx`
) => {

    const blob = new Blob(
        [buildSalaryWorkbook(employees, salaries)],
        {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);

};

export default exportSalariesToExcel;
