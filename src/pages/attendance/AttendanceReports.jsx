import { FiBarChart2 } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import AttendanceAnalytics from "../../components/attendance/AttendanceAnalytics";
import AttendanceReportCard from "../../components/attendance/AttendanceReportCard";
import useAuth from "../../hooks/useAuth";
import useTodayAttendance from "../../hooks/useTodayAttendance";
import { getAttendanceSummary, getAttendanceAnalytics } from "../../utils/attendance/attendanceUtils";

function AttendanceReports(){

  const { company } = useAuth();
  const { attendance, loading } = useTodayAttendance(company?.companyCode);
  const summary = getAttendanceSummary(attendance);
  const analytics = getAttendanceAnalytics(attendance);

  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Attendance Reports"
        subtitle="Analytics and exportable attendance reports"
        icon={<FiBarChart2 />}
      />

      <div className="mt-6">
        <AttendanceSummaryCards summary={summary} />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">

        <div className="xl:col-span-8">
          <AttendanceReportCard attendance={attendance} loading={loading} />
        </div>

        <div className="xl:col-span-4">
          <AttendanceAnalytics analytics={analytics} />
        </div>

      </div>

    </div>
  )
}

export default AttendanceReports;
