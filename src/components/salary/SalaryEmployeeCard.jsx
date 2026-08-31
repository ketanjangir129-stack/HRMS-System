import ActionMenu from "../common/ActionMenu";
import SalaryStatusBadge from "./SalaryStatusBadge";
import { getInitials } from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Salary Employee Card
|--------------------------------------------------------------------------
| One employee on the salary register: who they are on the left, and the
| state of their structure with the actions it allows on the right.
|
| The status pill and the three dot button share one row pinned to the top
| right of the card at every width — the pill immediately left of the
| button, the button on the card's right edge. Only the identity block
| below reflows as the card narrows.
|
| The padding, the divider between rows and the press state belong to
| `DataTable`, which is what renders this — the same as every other
| `mobileCard` in the product, so one row of the phone list looks the same
| whichever table it came from.
|--------------------------------------------------------------------------
*/

function SalaryEmployeeCard({ employee, actions = [] }) {

    const assigned = Boolean(employee.salaryAssigned);

    const role = [employee.department, employee.designation]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="flex items-start gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {getInitials(employee.name || employee.employeeId) || "--"}
            </div>

            {/* `min-w-0` is what keeps the identity block truncating instead
                of pushing the action area off the row. */}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:gap-3 ">

                <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                        {employee.name || employee.employeeId || "--"}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                        {employee.employeeId || "--"}
                    </p>

                    {/* Wraps rather than truncates: on a phone this is the
                        line with the least room and the most to say. */}
                    {role && (
                        <p className="mt-0.5 text-xs wrap-break-word text-slate-400">
                            {role}
                        </p>
                    )}

                </div>

                {/* Action area: status pill, then the three dot button on
                    the right edge. Never wraps, never reorders. */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

                    <SalaryStatusBadge assigned={assigned} compact />

                    <ActionMenu
                        items={actions}
                        label={`Actions for ${employee.name || employee.employeeId || "employee"}`}
                    />

                </div>

            </div>

        </div>
    );
}

export default SalaryEmployeeCard;
