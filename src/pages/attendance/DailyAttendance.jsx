import { FiCalendar } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceReportCard from "../../components/attendance/AttendanceReportCard";
import useAuth from "../../hooks/useAuth";
import useTodayAttendance from "../../hooks/useTodayAttendance";

function DailyAttendance() {
    const { company } = useAuth();
    const { attendance, loading } = useTodayAttendance(company?.companyCode);

    return (
        <div className="p-2">

            <AttendancePageHeader
                title="Daily Attendance"
                subtitle="Track today's check-in and check-out records"
                icon={<FiCalendar />}
            />

            <div className="mt-6">
                <AttendanceReportCard attendance={attendance} loading={loading} />
            </div>

        </div>
    );
}

export default DailyAttendance;
