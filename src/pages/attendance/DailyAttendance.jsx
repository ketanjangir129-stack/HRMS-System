import { useEffect, useMemo, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRecordsTable from "../../components/attendance/AttendanceRecordsTable";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";
import {
  buildDailyReport,
  getAttendanceSummary,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
| Today's punch in and punch out records, kept in realtime. Search comes from
| the header search bar.
|--------------------------------------------------------------------------
*/

function DailyAttendance() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const [markOpen, setMarkOpen] = useState(false);

  const {
    directory,
    departments,
    activeEmployees,
    activeCount,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  const { attendance, loading, error, markAttendance } =
    useDailyAttendance(companyCode);

  useEffect(() => {
    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const records = useMemo(
    () => buildDailyReport(attendance, directory),
    [attendance, directory]
  );

  const summary = useMemo(
    () => getAttendanceSummary(records, activeCount),
    [records, activeCount]
  );

  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Daily Attendance"
        subtitle="Track today's punch in and punch out records"
        icon={<FiCalendar />}
        action={
          isApprover(currentUser) && (
            <button
              type="button"
              onClick={() => setMarkOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
            >
              Mark Attendance
            </button>
          )
        }
      />

      <div className="mt-6 space-y-6">

        <AttendanceSummaryCards summary={summary} />

        <AttendanceRecordsTable
          records={records}
          loading={loading || directoryLoading}
          error={error || directoryError}
          onRetry={reloadDirectory}
          search={search}
          departments={departments}
          live
          emptyMessage="No employee has punched in today."
          exportName="daily-attendance"
        />

      </div>

      <MarkAttendanceModal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        onSave={markAttendance}
        employees={activeEmployees}
        dayRecords={records}
        recordsDate={getDateKey()}
      />

    </div>
  );

}

export default DailyAttendance;
