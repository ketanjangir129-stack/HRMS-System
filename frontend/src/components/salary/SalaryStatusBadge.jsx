/*
|--------------------------------------------------------------------------
| Salary Status Badge
|--------------------------------------------------------------------------
| Whether an employee has a salary structure, said the same way everywhere.
|
| The table cell and the phone card are the two callers, and they only differ
| in how much room they have for it, so `compact` steps the padding and the
| type down rather than each one restating the colours.
|--------------------------------------------------------------------------
*/

function SalaryStatusBadge({ assigned = false, compact = false }) {

    return (

        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${compact
                ? "px-2 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-xs"
                : "px-3 py-1 text-xs"
                } ${assigned
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
        >

            <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${assigned ? "bg-emerald-500" : "bg-amber-500"
                    }`}
            />

            {assigned ? "Assigned" : "Not Assigned"}

        </span>

    );

}

export default SalaryStatusBadge;
