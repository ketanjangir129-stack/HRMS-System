import { getInitials } from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Employee Card
|--------------------------------------------------------------------------
| The phone view of one row of the employees table. Below `md` the table is
| swapped for these cards instead of being scrolled sideways, which is the
| same width the payroll and holiday tables start dropping columns at.
|
| It renders a row the list has already loaded, filtered, searched and
| paginated — nothing is fetched or derived here beyond the initials.
|--------------------------------------------------------------------------
*/

const dash = <span className="text-slate-300">—</span>;

/*
| The status pill, shared with the table so the two views can never drift
| apart on what "Active" looks like.
*/
export function EmployeeStatusBadge({ status, size = "md" }) {

    const isActive = String(status || "").toLowerCase() === "active";

    const sizeClass =
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs";

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${sizeClass} ${
                isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
            }`}
        >
            <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-rose-500"
                }`}
            />
            {status}
        </span>
    );
}

function EmployeeCard({ employee, onOpen }) {

    // Employee id and email on one line, department and designation on the
    // next — the columns the table shows, stacked.
    const identity = [employee.employeeId, employee.email]
        .filter(Boolean)
        .join(" · ");

    const role = [employee.department, employee.designation]
        .filter(Boolean)
        .join(" · ");

    /*
    | A button when the row opens a details page, a plain card when the role
    | cannot open one — so nothing is focusable that does not do anything.
    */
    const Wrapper = onOpen ? "button" : "div";

    return (
        <Wrapper
            {...(onOpen
                ? {
                      type: "button",
                      onClick: onOpen,
                      "aria-label": `Open ${employee.name || employee.employeeId || "employee"}`,
                  }
                : {})}
            className={`block w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-200 ${
                onOpen
                    ? "cursor-pointer hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:bg-slate-50"
                    : ""
            }`}
        >

            {/* Spans rather than divs and paragraphs: a button may only hold
                phrasing content, and this card is a button whenever it opens
                the details page. */}
            <span className="flex items-start gap-3">

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {getInitials(employee.name || employee.employeeId) || "--"}
                </span>

                {/* `min-w-0` is what lets the long lines truncate instead of
                    pushing the status badge off the card. */}
                <span className="block min-w-0 flex-1">

                    <span className="flex items-start justify-between gap-2">

                        <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                            {employee.name || dash}
                        </span>

                        <EmployeeStatusBadge status={employee.status} size="sm" />

                    </span>

                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {identity || dash}
                    </span>

                    {role && (
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {role}
                        </span>
                    )}

                </span>

            </span>

        </Wrapper>
    );
}

export default EmployeeCard;
