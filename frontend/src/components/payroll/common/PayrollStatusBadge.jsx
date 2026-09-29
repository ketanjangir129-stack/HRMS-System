import {
  FALLBACK_BADGE,
  FALLBACK_DOT,
} from "../../../utils/attendance/attendanceConstants";
import {
  PAYROLL_PENDING,
  PAYROLL_STATUS_BADGES,
  PAYROLL_STATUS_DOTS,
} from "../../../utils/Payroll/payrollConstants";

/*
|--------------------------------------------------------------------------
| Payroll Status Badge
|--------------------------------------------------------------------------
| The same pill the attendance, leave and holiday tables use, keyed on the
| payroll status of a month.
|
| A row with no snapshot yet has no stored status to read, so it falls back
| to pending rather than to an empty pill: "not generated" is a state the
| dashboard has to show, not an absence.
|--------------------------------------------------------------------------
*/

function PayrollStatusBadge({ status, size = "md" }) {

  const value = status || PAYROLL_PENDING;

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1 text-xs";

  return (

    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold ring-1 ${sizeClass} ${PAYROLL_STATUS_BADGES[value] || FALLBACK_BADGE}`}
    >

      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${PAYROLL_STATUS_DOTS[value] || FALLBACK_DOT}`}
      />

      {value}

    </span>

  );

}

export default PayrollStatusBadge;
