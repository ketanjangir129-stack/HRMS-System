// Field definitions shared by the salary form and the salary history page,
// so both show the same labels in the same order.

export const EARNING_FIELDS = [
    { name: "basic", label: "Basic Salary" },
    { name: "hra", label: "HRA (House Rent Allowance)" },
    { name: "da", label: "DA (Dearness Allowance)" },
    { name: "conveyance", label: "Conveyance" },
    { name: "medical", label: "Medical" },
    { name: "specialAllowance", label: "Special Allowance" },
    { name: "bonus", label: "Bonus" },
];

export const DEDUCTION_FIELDS = [
    { name: "pf", label: "PF (Provident Fund)" },
    { name: "esi", label: "ESI (Employees State Insurance)" },
    { name: "professionalTax", label: "Professional Tax" },
    { name: "incomeTax", label: "Income Tax" },
    { name: "loan", label: "Loan" },
    { name: "other", label: "Other" },
];

const FIELD_LABELS = [
    ...EARNING_FIELDS,
    ...DEDUCTION_FIELDS,
].reduce(
    (labels, field) => ({
        ...labels,
        [field.name]: field.label,
    }),
    {}
);

// old records may contain keys that are no longer part of the form,
// so fall back to a readable version of the key itself
export const getFieldLabel = (key) => {
    if (FIELD_LABELS[key]) {
        return FIELD_LABELS[key];
    }
    const spaced = key.replace(/([A-Z])/g, " $1");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
