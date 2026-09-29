import AttendanceStatusBadge from "../../attendance/common/AttendanceStatusBadge";

/*
|--------------------------------------------------------------------------
| Leave Status Badge
|--------------------------------------------------------------------------
| Leave requests move through the same three states as attendance requests
| (Pending / Approved / Rejected), so the shared request badge is reused
| instead of a second set of colours that would drift apart over time.
|--------------------------------------------------------------------------
*/

function LeaveStatusBadge({ status, size = "md" }) {

  return (
    <AttendanceStatusBadge
      status={status}
      variant="request"
      size={size}
    />
  );

}

export default LeaveStatusBadge;
