/*
|--------------------------------------------------------------------------
| Salary Dates
|--------------------------------------------------------------------------
| How a revision stamp is written across the salary module.
|
| A stamp that cannot be read as a date is handed back exactly as it was
| stored rather than shown as "Invalid Date": whatever is in the record is
| more use to whoever has to explain it than the parser's opinion of it.
|--------------------------------------------------------------------------
*/

const toDate = (value) => {

    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;

};

// "12 Aug 2026, 4:30 PM" — for a revision, where the time tells two apart.
export const formatRevisionDateTime = (value) => {

    const date = toDate(value);

    if (!date) return value || "—";

    return date.toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

};

// "12 Aug 2026" — for a record filed by the day it belongs to.
export const formatSalaryDate = (value) => {

    const date = toDate(value);

    if (!date) return value || "—";

    return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

};
