import { EARNING_FIELDS, DEDUCTION_FIELDS } from "./salaryFields";

/*
|--------------------------------------------------------------------------
| Salary Import Columns
|--------------------------------------------------------------------------
| The one description of what a salary import file looks like. The template
| that is handed out, the parser that reads a file back and the preview table
| that shows what was read are all built from this list, so a column cannot be
| added to the template without the parser learning to read it.
|
| `group` is the band the column sits under - Employee Details, Earnings or
| Deductions - and is what the template's merged header row and the preview's
| column groups are drawn from.
|
| `kind` is how a cell is read:
|
|   text   - taken as written
|   date   - an effective date, however Excel handed it over
|   amount - a rupee figure
|   status - Active / Inactive
|
| `required` is a cell that must carry a value. An empty one is an error on
| that row rather than a zero, because a blank basic salary is somebody
| forgetting to fill the column in, not somebody being paid nothing. Every
| other amount is optional and an empty cell there means 0.
|
| `readOnly` marks the four deductions the HR Policy prices itself. They stay
| in the template so the file matches what the salary screen shows, but
| whatever is typed into them is replaced by the policy's own figure - the
| same rule the salary form follows, so an import cannot introduce a structure
| the policy screen disagrees with.
*/

export const IMPORT_GROUPS = {
    EMPLOYEE: "Employee Details",
    EARNINGS: "Earnings",
    DEDUCTIONS: "Deductions",
};

/*
| Alternative spellings a column may arrive under. The field's own key and its
| label are always accepted, so these are only the extras: what somebody would
| plausibly type by hand, and the short forms the labels carry in brackets.
*/
const EARNING_ALIASES = {
    basic: ["basic", "basic pay", "basic amount"],
    hra: ["hra", "house rent allowance"],
    da: ["da", "dearness allowance"],
    conveyance: ["conveyance allowance", "transport", "travel allowance"],
    medical: ["medical allowance"],
    specialAllowance: ["special allowance", "special"],
    bonus: ["bonus amount", "incentive"],
};

const DEDUCTION_ALIASES = {
    pf: ["pf", "provident fund", "epf", "employee pf"],
    esi: ["esi", "employees state insurance", "employee state insurance"],
    professionalTax: ["professional tax", "ptax", "pt"],
    incomeTax: ["income tax", "tds", "it"],
    loan: ["loan deduction", "advance", "loan emi"],
    other: ["other", "other deduction", "others", "other deductions", "misc"],
};

export const IMPORT_COLUMNS = [

    {
        key: "employeeId",
        label: "Employee ID",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "text",
        required: true,
        aliases: ["emp id", "employee code", "empcode", "emp no"],
        note: "Must match an employee on the register",
        sample: "EMP001",
    },

    /*
    | Name, department and designation are carried so the file reads as
    | something about people rather than a grid of IDs, and so the preview can
    | be checked against the register before anything is written. They are not
    | imported: the register is where those live, and a salary import that
    | could quietly rename an employee would be a worse thing than a helpful
    | one.
    */
    {
        key: "name",
        label: "Name",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "text",
        reference: true,
        aliases: ["employee name", "full name"],
        note: "For reference only - read from the register",
        sample: "Ravi Kumar",
    },

    {
        key: "department",
        label: "Department",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "text",
        reference: true,
        note: "For reference only - read from the register",
        sample: "Engineering",
    },

    {
        key: "designation",
        label: "Designation",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "text",
        reference: true,
        note: "For reference only - read from the register",
        sample: "Software Engineer",
    },

    {
        key: "effectiveFrom",
        label: "Effective From",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "date",
        aliases: ["effective date", "w e f", "wef", "from date"],
        note: "YYYY-MM-DD. Left empty, the joining date is used",
        sample: "2026-04-01",
    },

    ...EARNING_FIELDS.map((field) => ({
        key: field.name,
        label: field.label,
        group: IMPORT_GROUPS.EARNINGS,
        kind: "amount",
        // A structure with nothing in it is not a structure.
        required: field.name === "basic",
        aliases: EARNING_ALIASES[field.name] || [],
        sample:
            field.name === "basic"
                ? 25000
                : field.name === "hra"
                    ? 10000
                    : 0,
    })),

    ...DEDUCTION_FIELDS.map((field) => ({
        key: field.name,
        label: field.label,
        group: IMPORT_GROUPS.DEDUCTIONS,
        kind: "amount",
        readOnly: ["pf", "esi", "professionalTax", "incomeTax"].includes(
            field.name
        ),
        aliases: DEDUCTION_ALIASES[field.name] || [],
        sample: 0,
    })),

    {
        key: "status",
        label: "Status",
        group: IMPORT_GROUPS.EMPLOYEE,
        kind: "status",
        note: "Active or Inactive. Empty means Active",
        sample: "Active",
    },

];

export const EARNING_KEYS = EARNING_FIELDS.map((field) => field.name);

export const DEDUCTION_KEYS = DEDUCTION_FIELDS.map((field) => field.name);

// The four the HR Policy prices, in the order the deduction band shows them.
export const POLICY_DRIVEN_KEYS = IMPORT_COLUMNS
    .filter((column) => column.readOnly)
    .map((column) => column.key);

export const COLUMN_BY_KEY = IMPORT_COLUMNS.reduce(
    (columns, column) => ({ ...columns, [column.key]: column }),
    {}
);

/*
| A header cell reduced to the part that identifies it, so "PF (Provident
| Fund)", "pf" and " P.F. " all arrive as "pf". Case, spacing, punctuation and
| anything in brackets are all things a header survives being written with.
*/
export const normalizeHeader = (value) =>
    String(value ?? "")
        .replace(/\(.*?\)/g, " ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

/*
| Every spelling a column answers to: its key, its label, its label without the
| bracketed half, and the aliases above.
*/
const spellingsOf = (column) => [
    column.key,
    column.label,
    ...(column.aliases || []),
];

export const HEADER_LOOKUP = IMPORT_COLUMNS.reduce((lookup, column) => {

    spellingsOf(column).forEach((spelling) => {

        const normalized = normalizeHeader(spelling);

        // The first column to claim a spelling keeps it, so a later column's
        // loose alias can never steal an earlier column's own name.
        if (normalized && !lookup[normalized]) {
            lookup[normalized] = column.key;
        }

    });

    return lookup;

}, {});

/*
| The same lookup with the spaces taken out, consulted only when the first one
| does not know a heading.
|
| Short forms are written both ways and mean the same column: "P Tax" and
| "PTax", "Emp ID" and "EmpID", "Special Allowance" and "SpecialAllowance".
| Spacing is the one difference between them, and a column silently read as
| empty because somebody put a space in its heading is the kind of mistake
| that only shows up as a wrong deduction later.
|
| It is a fallback rather than the main lookup so that a heading which matches
| a column exactly always wins, and only genuinely unrecognised ones fall
| through to this looser match.
*/
const COMPACT_HEADER_LOOKUP = Object.entries(HEADER_LOOKUP).reduce(
    (lookup, [spelling, key]) => {

        const compact = spelling.replace(/\s+/g, "");

        if (compact && !lookup[compact]) {
            lookup[compact] = key;
        }

        return lookup;

    },
    {}
);

// The column a heading belongs to, or `undefined` for one we do not read.
export const resolveHeader = (value) => {

    const normalized = normalizeHeader(value);

    if (!normalized) return undefined;

    return (
        HEADER_LOOKUP[normalized] ||
        COMPACT_HEADER_LOOKUP[normalized.replace(/\s+/g, "")]
    );

};

export const REQUIRED_COLUMN_KEYS = IMPORT_COLUMNS
    .filter((column) => column.required)
    .map((column) => column.key);
