import { ATTENDANCE_STATUS } from "../../utils/attendance/attendanceConstants";
import AttendanceRecordsTable from "./AttendanceRecordsTable";

/*
|--------------------------------------------------------------------------
| Today's Attendance (Dashboard)
|--------------------------------------------------------------------------
| The shared records table with the live badge and the day's totals, without
| the filters and export that belong on the dedicated pages.
|--------------------------------------------------------------------------
*/

function TodayFooter({ records }) {

  const punchedIn = records.filter(
    (record) =>
      record.status === ATTENDANCE_STATUS.PRESENT ||
      record.status === ATTENDANCE_STATUS.LATE
  ).length;

  const punchedOut = records.filter(
    (record) => record.punchOut
  ).length;

  const stats = [
    {
      label: "Punched in",
      value: punchedIn,
      caption: `of ${records.length}`,
    },
    {
      label: "Punched out",
      value: punchedOut,
      caption: "employees",
    },
    {
      label: "Still working",
      value: Math.max(punchedIn - punchedOut, 0),
      caption: "employees",
    },
  ];

  return (
    /*
    | Three across from `sm`. On a phone they stack instead: three columns in
    | a 360px card would break "Punched out" across two lines and leave the
    | numbers sitting under each other's captions.
    */
    <div className="grid grid-cols-1 divide-y divide-line-subtle border-t border-line bg-surface-muted/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

      {stats.map((stat) => (

        <div key={stat.label} className="px-4 py-3 sm:px-6 sm:py-4">

          <p className="ui-eyebrow">
            {stat.label}
          </p>

          <p className="mt-1 text-lg font-bold text-ink">
            {stat.value}{" "}
            <span className="text-sm font-medium text-ink-subtle">
              {stat.caption}
            </span>
          </p>

        </div>

      ))}

    </div>
  );

}

/*
| The approval column is shown here without its buttons: the dashboard is
| where a day is read, and the deciding is done on the daily attendance page,
| where the filters that pick the pending days out of a full roster are. What
| it is for is the Pending badges - the reason a present count on this page
| can look lower than the punches under it.
*/

const READ_ONLY_APPROVAL = { canReview: false };

function AttendanceTodayTable({ attendance = [], loading, error, onRetry }) {
  return (
    <AttendanceRecordsTable
      records={attendance}
      loading={loading}
      error={error}
      onRetry={onRetry}
      title="Today's Attendance"
      subtitle="Live attendance of all employees"
      live
      showFilters={false}
      showExport={false}
      approval={READ_ONLY_APPROVAL}
      emptyMessage="No employee has punched in today."
      footer={
        attendance.length > 0 ? (
          <TodayFooter records={attendance} />
        ) : null
      }
    />
  );
}

export default AttendanceTodayTable;
