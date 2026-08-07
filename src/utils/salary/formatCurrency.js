export const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

// Payroll figures carry paise, and a payslip has to print them: a rounded
// rupee amount would not add up to the net salary printed underneath it.
export const formatAmount = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default formatCurrency;
