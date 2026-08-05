export const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

export default formatCurrency;
