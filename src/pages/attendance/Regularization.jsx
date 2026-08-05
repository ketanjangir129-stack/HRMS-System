import { FiRefreshCw } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";

function Regularization(){
  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Regularization"
        subtitle="Approve attendance corrections raised by employees"
        icon={<FiRefreshCw />}
      />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl text-purple-600">
          <FiRefreshCw />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          No regularization requests
        </h2>

        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Correction requests submitted by employees will appear here for approval.
        </p>

      </div>

    </div>
  )
}

export default Regularization;
