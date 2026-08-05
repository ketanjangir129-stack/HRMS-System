import { useMemo } from "react";
import {
  FiClock,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";
import useAttendance from "../../hooks/useAttendance";
import { toast } from "react-toastify";

function TodayAttendanceCard({ className = "" }) {
  const { company, currentUser } = useAuth();

  const {
    attendance,
    loading,
    checkIn,
    checkOut,
  } = useAttendance(
    company?.companyCode,
    currentUser
  );

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return "--";

    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCheckIn = async () => {
    const result = await checkIn();

    if (result.success) {
      toast.success("Checked In Successfully");
    } else {
      toast.error(result.message);
    }
  };

  const handleCheckOut = async () => {
    const result = await checkOut();

    if (result.success) {
      toast.success("Checked Out Successfully");
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-center bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>

      <div className="flex items-start justify-between gap-4">

        <div>

          <h2 className="text-xl font-semibold text-slate-900">
            Today's Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {currentUser?.personalInfo?.name}
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">

          <FiClock />

          {currentTime}

        </div>

      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

          <p className="text-sm text-slate-500">
            Status
          </p>

          <h3 className="mt-2 text-lg font-semibold text-slate-900">

            {attendance
              ? attendance.checkOut
                ? "Completed"
                : "Checked In"
              : "Not Checked In"}

          </h3>

        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

          <p className="text-sm text-slate-500">
            Check In
          </p>

          <h3 className="mt-2 text-lg font-semibold text-slate-900">

            {attendance
              ? formatTime(attendance.checkIn)
              : "--"}

          </h3>

        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

          <p className="text-sm text-slate-500">
            Check Out
          </p>

          <h3 className="mt-2 text-lg font-semibold text-slate-900">

            {attendance?.checkOut
              ? formatTime(attendance.checkOut)
              : "--"}

          </h3>

        </div>

      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">

        {!attendance && (

          <button
            onClick={handleCheckIn}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >

            <FiLogIn />

            Check In

          </button>

        )}

        {attendance && !attendance.checkOut && (

          <button
            onClick={handleCheckOut}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >

            <FiLogOut />

            Check Out

          </button>

        )}

        {attendance?.checkOut && (

          <div className="flex items-center gap-2 text-green-600 font-semibold">

            <FiCheckCircle />

            Attendance Completed

          </div>

        )}

      </div>

    </div>
  );
}

export default TodayAttendanceCard;
