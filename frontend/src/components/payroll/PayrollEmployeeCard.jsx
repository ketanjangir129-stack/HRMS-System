import ActionMenu from "../common/ActionMenu";
import { getInitials } from "../../utils/attendance/attendanceUtils";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import {
    PAYROLL_PENDING,
    PAYROLL_STATUS,
} from "../../utils/Payroll/payrollConstants";
import PayrollStatusBadge from "./common/PayrollStatusBadge";

/*
|--------------------------------------------------------------------------
| Payroll Employee Card
|--------------------------------------------------------------------------
| One employee's month, for the widths where the table has no room for six
| columns — the same rows `PayrollTable` renders from `md` up.
|
| It is the salary register row with the month's figure added: the status
| pill and the three dot button share the top right at every width, and the
| net payable sits on a line of its own underneath, because an amount
| squeezed in beside the name is the first thing to truncate and the last
| thing anybody wants truncated.
|
| The padding, the divider between rows and the press state belong to
| `DataTable`, which is what renders this — the same as every other
| `mobileCard` in the product.
|--------------------------------------------------------------------------
*/

function PayrollEmployeeCard({ employee, actions = [] }) {

    const generated = Boolean(employee.payrollGenerated);

    const role = [employee.department, employee.designation]
        .filter(Boolean)
        .join(" · ");

    return (
        <div>

            <div className="flex items-start gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {getInitials(employee.name || employee.employeeId) || "--"}
                </div>

                {/* `min-w-0` is what keeps the identity block truncating instead
                    of pushing the action area off the row. */}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:gap-3">

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

                        <PayrollStatusBadge
                            status={
                                generated
                                    ? employee.payrollStatus ||
                                      PAYROLL_STATUS.GENERATED
                                    : PAYROLL_PENDING
                            }
                            size="sm"
                        />

                        <ActionMenu
                            items={actions}
                            label={`Actions for ${employee.name || employee.employeeId || "employee"}`}
                        />

                    </div>

                </div>

            </div>

            {/*
            | A pending employee has no snapshot yet, so there is no figure to
            | show — the dash says the month has not been run for them rather
            | than that they are owed nothing.
            */}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Net Payable
                </span>

                <span
                    className={`truncate text-sm font-bold ${
                        employee.netPayable === null ||
                        employee.netPayable === undefined
                            ? "text-slate-300"
                            : "text-slate-900"
                    }`}
                >
                    {employee.netPayable === null ||
                    employee.netPayable === undefined
                        ? "--"
                        : formatCurrency(employee.netPayable)}
                </span>

            </div>

        </div>
    );
}

export default PayrollEmployeeCard;
