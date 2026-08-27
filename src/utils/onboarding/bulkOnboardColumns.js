import * as XLSX from "xlsx";

/*
|--------------------------------------------------------------------------
| Bulk On-boarding Columns
|--------------------------------------------------------------------------
| The one description of what an import file has to carry. The guide shown
| on the Bulk On-boarding page, the sample template the user downloads, the
| header matching done while reading a file and the per field validation
| are all read from this list, so a column is added or renamed here alone.
|
| `aliases` is what makes a hand made sheet usable: a heading is matched on
| its letters and digits only, so "Employee ID", "employee_id" and "EmpID"
| all land on the same column.
|--------------------------------------------------------------------------
*/

export const BULK_ONBOARD_COLUMNS = [

    {
        key: "employeeId",
        label: "Employee ID",
        required: true,
        example: "EMP101",
        hint: "3-20 characters using letters, numbers, - or _. Must be unique.",
        aliases: ["empid", "employeecode", "empcode", "code"],
    },

    {
        key: "name",
        label: "Employee Name",
        required: true,
        example: "Aarav Sharma",
        hint: "Letters and spaces only, 3-50 characters.",
        aliases: ["employeename", "fullname", "staffname"],
    },

    {
        key: "email",
        label: "Email",
        required: true,
        example: "aarav.sharma@company.com",
        hint: "A working address — the invitation is addressed to it.",
        aliases: ["emailid", "emailaddress", "officeemail", "workemail"],
    },

    {
        key: "mobile",
        label: "Mobile Number",
        required: true,
        example: "9876543210",
        hint: "10 digits starting with 6-9, without the country code.",
        aliases: ["mobileno", "phone", "phoneno", "phonenumber", "contact", "contactnumber"],
    },

    {
        key: "department",
        label: "Department",
        required: true,
        example: "Engineering",
        hint: "Must already exist under Departments.",
        aliases: ["dept", "departmentname"],
    },

    {
        key: "designation",
        label: "Designation",
        required: true,
        example: "Software Engineer",
        hint: "Must belong to the department named in the same row.",
        aliases: ["jobtitle", "title", "designationname"],
    },

    {
        key: "joiningDate",
        label: "Joining Date",
        required: true,
        example: "2026-09-01",
        hint: "YYYY-MM-DD. A real Excel date cell is read correctly too.",
        aliases: ["doj", "dateofjoining", "joindate", "joiningdt"],
    },

    {
        key: "employeeType",
        label: "Employee Type",
        required: true,
        example: "Full Time",
        hint: "For example Full Time, Part Time or Contract.",
        aliases: ["type", "employmenttype", "worktype"],
    },

    {
        key: "role",
        label: "Role",
        required: false,
        example: "employee",
        hint: "employee or hr. Left blank it becomes employee.",
        aliases: ["accessrole", "userrole", "systemrole", "loginrole"],
    },

];

/* The roles the account can be opened with. */
export const BULK_ONBOARD_ROLES = ["employee", "hr"];

export const REQUIRED_BULK_ONBOARD_COLUMNS =
    BULK_ONBOARD_COLUMNS.filter((column) => column.required);

/*
| A heading is compared on its letters and digits alone, so spacing, case,
| underscores and a stray asterisk on a required column all stop mattering.
*/
export const normalizeHeader = (value) =>
    String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const HEADER_LOOKUP = BULK_ONBOARD_COLUMNS.reduce((lookup, column) => {

    [column.key, column.label, ...(column.aliases || [])].forEach((name) => {
        lookup[normalizeHeader(name)] = column.key;
    });

    return lookup;

}, {});

/* The column a heading belongs to, or "" when the sheet carries a spare one. */
export const matchHeader = (heading) =>
    HEADER_LOOKUP[normalizeHeader(heading)] || "";

/*
|--------------------------------------------------------------------------
| Sample template
|--------------------------------------------------------------------------
| The fastest way past a rejected file is a file that was already shaped
| correctly, so the guide hands one out. The two sample rows are filled in
| rather than blank: an example row is a specification a person can read.
|--------------------------------------------------------------------------
*/

const SAMPLE_ROWS = [
    [
        "EMP101",
        "Aarav Sharma",
        "aarav.sharma@company.com",
        "9876543210",
        "Engineering",
        "Software Engineer",
        "2026-09-01",
        "Full Time",
        "employee",
    ],
    [
        "EMP102",
        "Diya Nair",
        "diya.nair@company.com",
        "9812345670",
        "Human Resources",
        "HR Executive",
        "2026-09-15",
        "Full Time",
        "hr",
    ],
];

export const downloadBulkOnboardTemplate = (
    fileName = "Bulk-Onboarding-Template.xlsx"
) => {

    const headings = BULK_ONBOARD_COLUMNS.map((column) =>
        column.required ? `${column.label} *` : column.label
    );

    const sheet = XLSX.utils.aoa_to_sheet([headings, ...SAMPLE_ROWS]);

    sheet["!cols"] = BULK_ONBOARD_COLUMNS.map((column) => ({
        wch: Math.max(16, column.label.length + 4),
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, "Employees");

    const blob = new Blob(
        [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
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
