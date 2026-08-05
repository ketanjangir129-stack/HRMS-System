import { FiUsers } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceShiftCard from "../../components/attendance/AttendanceShiftCard";

function ShiftManagement(){
  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Shift Management"
        subtitle="Configure work shifts and assign employees"
        icon={<FiUsers />}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        <AttendanceShiftCard />

      </div>

    </div>
  )
}

export default ShiftManagement;
