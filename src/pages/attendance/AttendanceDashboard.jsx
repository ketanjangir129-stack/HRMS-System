import { useState } from "react";
import { toast } from "react-toastify";
import AttendanceHeader from "../../components/attendance/AttendanceHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import AttendanceTodayTable from "../../components/attendance/AttendanceTodayTable";
import AttendanceQuickActions from "../../components/attendance/AttendanceQuickActions";
import AttendanceCalendar from "../../components/attendance/AttendanceCalender/AttendanceCalendar";
import AttendanceAnalytics from "../../components/attendance/AttendanceAnalytics";
import AttendanceRecentActivity from "../../components/attendance/AttendanceRecentActivity";
import AttendanceRequests from "../../components/attendance/AttendanceRequests";
import AttendanceShiftCard from "../../components/attendance/AttendanceShiftCard";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import TodayAttendanceCard from "../../components/attendance/TodayAttendanceCard";
import useAuth from "../../hooks/useAuth";
import useTodayAttendance from "../../hooks/useTodayAttendance";
import useAttendanceHistory from "../../hooks/useAttendanceHistory";
import {
  getAttendanceSummary,
  getAttendanceAnalytics,
  getAttendanceActivities,
} from "../../utils/attendance/attendanceUtils";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import {
  approveAttendanceRequest,
  rejectAttendanceRequest,
} from "../../services/attendanceServices/attendanceRequestService";

function AttendanceDashboard() {

  const [showModal, setShowModal] = useState(false);
  const { company } = useAuth();
  const { currentUser } = useAuth();
  const employeeId = currentUser?.employmentInfo?.employeeId;
  const { attendance, loading, } = useTodayAttendance(company?.companyCode);
  const summary = getAttendanceSummary(attendance);
  const analytics = getAttendanceAnalytics(attendance);
  const activities = getAttendanceActivities(attendance);
  const { requests} = useAttendanceRequests(company?.companyCode);
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const {
    history,
    loading: calendarLoading,
  } = useAttendanceHistory(
    company?.companyCode,
    employeeId,
    year,
    month
  );
  const handleApprove = async (request) => {
    const result = await approveAttendanceRequest(
      company.companyCode,
      request,
      currentUser?.personalInfo?.name || "Admin"
    );
    if (result.success) {
      toast.success("Attendance request approved.");
    }
  };
  const handleReject = async (request) => {
    await rejectAttendanceRequest(
      company.companyCode,
      request.requestId,
      currentUser?.personalInfo?.name || "Admin",
      "Rejected"
    );
    toast.success("Attendance request rejected.");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

      <AttendanceHeader onMarkAttendance={() => setShowModal(true)} />

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <TodayAttendanceCard className="h-full" />
        </div>

        <div className="xl:col-span-7">
          <AttendanceSummaryCards
            summary={summary}
            compact
            gridClassName="grid-cols-1 sm:grid-cols-2 sm:grid-rows-2"
          />
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        <div className="xl:col-span-8">
          <AttendanceTodayTable attendance={attendance} loading={loading} />
        </div>

        <div className="xl:col-span-4">
          <AttendanceQuickActions />
        </div>

      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">

        <div className="xl:col-span-4">
          <AttendanceCalendar history={history} loading={calendarLoading} />
        </div>

        <div className="xl:col-span-4">
          <AttendanceAnalytics analytics={analytics} />
        </div>

        <div className="lg:col-span-2 xl:col-span-4">
          <AttendanceRecentActivity activities={activities} />
        </div>

      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        <div className="xl:col-span-7">
          <AttendanceRequests
            requests={requests}
            loading={loading}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>

        <div className="xl:col-span-5">
          <AttendanceShiftCard />
        </div>

      </div>

      <MarkAttendanceModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />

    </div>
  );
}

export default AttendanceDashboard;
