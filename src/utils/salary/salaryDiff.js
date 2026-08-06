import {
    EARNING_FIELDS,
    DEDUCTION_FIELDS,
    getFieldLabel,
} from "./salaryFields";

// amounts come from number inputs, so they can be "", "0", 0 or undefined
const toAmount = (value) => Number(value || 0);

const SUMMARY_FIELDS = [
    { name: "grossSalary", label: "Gross Salary" },
    { name: "totalDeduction", label: "Total Deduction" },
    { name: "netSalary", label: "Net Salary" },
];

const DETAIL_FIELDS = [
    { name: "effectiveFrom", label: "Effective From" },
    { name: "status", label: "Status" },
];

export const CHANGE_GROUPS = [
    "Earnings",
    "Deductions",
    "Summary",
    "Details",
];

// form fields first, then any legacy key that only exists on older records
const fieldsToCompare = (fields, before, after) => {

    const known = fields.map((field) => field.name);

    const extras = [
        ...new Set([
            ...Object.keys(before || {}),
            ...Object.keys(after || {}),
        ]),
    ]
        .filter((key) => !known.includes(key))
        .map((key) => ({
            name: key,
            label: getFieldLabel(key),
        }));

    return [...fields, ...extras];

};

const compareSection = (fields, before, after, group) =>

    fieldsToCompare(fields, before, after).reduce((changes, field) => {

        const from = toAmount(before?.[field.name]);
        const to = toAmount(after?.[field.name]);

        if (from === to) {
            return changes;
        }

        return [
            ...changes,
            {
                key: `${group}-${field.name}`,
                label: field.label,
                group,
                type: "currency",
                from,
                to,
                difference: to - from,
            },
        ];

    }, []);

const compareFields = (fields, before, after, group, type) =>

    fields.reduce((changes, field) => {

        const rawFrom = before?.[field.name];
        const rawTo = after?.[field.name];

        const from =
            type === "currency" ? toAmount(rawFrom) : rawFrom || "—";

        const to =
            type === "currency" ? toAmount(rawTo) : rawTo || "—";

        if (from === to) {
            return changes;
        }

        return [
            ...changes,
            {
                key: `${group}-${field.name}`,
                label: field.label,
                group,
                type,
                from,
                to,
                difference:
                    type === "currency" ? to - from : null,
            },
        ];

    }, []);

export const buildSalaryChanges = (previous, current) => {

    if (!previous || !current) {
        return [];
    }

    return [
        ...compareSection(
            EARNING_FIELDS,
            previous.earnings,
            current.earnings,
            "Earnings"
        ),
        ...compareSection(
            DEDUCTION_FIELDS,
            previous.deductions,
            current.deductions,
            "Deductions"
        ),
        ...compareFields(
            SUMMARY_FIELDS,
            previous,
            current,
            "Summary",
            "currency"
        ),
        ...compareFields(
            DETAIL_FIELDS,
            previous,
            current,
            "Details",
            "text"
        ),
    ];

};

export const groupSalaryChanges = (changes) =>

    CHANGE_GROUPS.map((group) => ({
        group,
        changes: changes.filter(
            (change) => change.group === group
        ),
    })).filter((section) => section.changes.length > 0);
