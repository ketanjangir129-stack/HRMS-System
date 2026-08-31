import { validateField } from "../validation/validateField";
import {
    BULK_ONBOARD_COLUMNS,
    BULK_ONBOARD_ROLES,
} from "./bulkOnboardColumns";

/*
|--------------------------------------------------------------------------
| Validate Bulk On-boarding Rows
|--------------------------------------------------------------------------
| Every row of an import is judged before a single record is written, so the
| user is shown one honest summary instead of discovering the eleventh row
| was wrong after ten invitations have already gone out.
|
| A row is checked four ways, and every failure is collected rather than the
| first one returned — a half fixed file is a second rejected upload:
|
|   1. the same field rules the single on-boarding form uses
|   2. the department and designation actually existing in this company
|   3. the row not repeating an earlier row of the same file
|   4. the person not already being on the payroll or already invited
|
| Nothing here writes anything. The rows it marks valid are what the page
| hands to the service once the user has agreed to the summary.
|--------------------------------------------------------------------------
*/

const normalize = (value) => String(value ?? "").trim().toLowerCase();

/*
| Departments arrive as the nested object the database stores them in. This
| flattens them to "department name -> the designations under it", both
| sides lower cased, because a sheet will not match our capitalisation.
*/
export const buildDepartmentIndex = (departments = []) => {

    const index = new Map();

    departments.forEach((department) => {

        const name = normalize(department?.name);

        if (!name) {
            return;
        }

        const designations = new Set(
            Object.values(department.designations || {})
                .map((designation) => normalize(designation?.name))
                .filter(Boolean)
        );

        index.set(name, {
            label: department.name,
            designations,
        });

    });

    return index;
};

const UNIQUE_FIELDS = [
    { key: "employeeId", label: "Employee ID" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile Number" },
];

export const validateBulkOnboardRows = (
    rows = [],
    {
        departmentIndex = new Map(),
        identityIndex = null,
    } = {}
) => {

    /* What this file has already used, so row 9 can point back at row 4. */
    const seen = {
        employeeId: new Map(),
        email: new Map(),
        mobile: new Map(),
    };

    const valid = [];
    const invalid = [];

    rows.forEach((row) => {

        const values = { ...row.values };

        // A blank role is the common case, not a mistake.
        if (!values.role) {
            values.role = "employee";
        }

        const errors = [];

        /* 1. The field rules the single on-boarding form already uses. */
        BULK_ONBOARD_COLUMNS.forEach((column) => {

            // `role` is a fixed list rather than a pattern; checked below.
            if (column.key === "role") {
                return;
            }

            const message = validateField(
                column.key,
                values[column.key],
                values
            );

            if (message) {
                errors.push({
                    field: column.label,
                    message,
                });
            }

        });

        const role = normalize(values.role);

        if (!BULK_ONBOARD_ROLES.includes(role)) {
            errors.push({
                field: "Role",
                message: `Role must be ${BULK_ONBOARD_ROLES.join(" or ")}.`,
            });
        } else {
            values.role = role;
        }

        /* 2. The department and the designation under it must be real. */
        const departmentKey = normalize(values.department);

        const department = departmentIndex.get(departmentKey);

        if (departmentKey && !department) {

            errors.push({
                field: "Department",
                message: `"${values.department}" is not a department in this company.`,
            });

        } else if (department) {

            // Write back the company's spelling, not the sheet's.
            values.department = department.label;

            const designationKey = normalize(values.designation);

            if (designationKey && !department.designations.has(designationKey)) {
                errors.push({
                    field: "Designation",
                    message: `"${values.designation}" is not a designation under ${department.label}.`,
                });
            }

        }

        /* 3. The file repeating itself. */
        UNIQUE_FIELDS.forEach(({ key, label }) => {

            const value = normalize(values[key]);

            if (!value) {
                return;
            }

            const firstRow = seen[key].get(value);

            if (firstRow) {
                errors.push({
                    field: label,
                    message: `Duplicate — the same ${label} is already used in row ${firstRow}.`,
                });
                return;
            }

            seen[key].set(value, row.rowNumber);

        });

        /* 4. The person already being on the payroll or already invited. */
        if (identityIndex) {

            UNIQUE_FIELDS.forEach(({ key, label }) => {

                const value = normalize(values[key]);

                if (!value) {
                    return;
                }

                const taken =
                    key === "employeeId"
                        ? identityIndex.employeeIds
                        : key === "email"
                            ? identityIndex.emails
                            : identityIndex.mobiles;

                if (taken.has(value)) {
                    errors.push({
                        field: label,
                        message: `${label} already exists in your company.`,
                    });
                }

            });

        }

        const record = {
            rowNumber: row.rowNumber,
            values,
            errors,
        };

        if (errors.length) {
            invalid.push(record);
        } else {
            valid.push(record);
        }

    });

    return {
        total: rows.length,
        valid,
        invalid,
        errorCount: invalid.reduce(
            (count, row) => count + row.errors.length,
            0
        ),
    };
};

export default validateBulkOnboardRows;
