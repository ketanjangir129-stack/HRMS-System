import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiLogIn,
  FiLogOut,
} from "react-icons/fi";
import { toast } from "react-toastify";
import useAttendance from "../../hooks/useAttendance";
import useAuth from "../../hooks/useAuth";
import { formatTime } from "../../utils/attendance/attendanceDate";
import AttendanceStatusBadge from "./common/AttendanceStatusBadge";

/*
|--------------------------------------------------------------------------
| My Attendance Today
|--------------------------------------------------------------------------
| The signed in employee's punch in / punch out card. The record comes from a
| realtime subscription, so the card updates the moment a punch is written
| without a refresh.
|--------------------------------------------------------------------------
*/

const CLOCK_INTERVAL = 30 * 1000;

const useClock = () => {

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {

    const timer = setInterval(() => setNow(new Date()), CLOCK_INTERVAL);

    return () => clearInterval(timer);

  }, []);

  return now;

};

/*
| The card sits in a narrow dashboard column, so the label and the value are
| both kept on one line: a wrapped "Punch Out" over a wrapped "02:58 pm" is
| what makes a stat tile look broken.
*/

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex h-7 items-center whitespace-nowrap text-lg font-semibold text-slate-900">
        {value}
      </div>

    </div>
  );
}

function TodayAttendanceCard({ className = "" }) {

  const { company, currentUser } = useAuth();

  const {
    attendance,
    loading,
    error,
    employeeId,
    punchIn,
    punchOut,
  } = useAttendance(company?.companyCode, currentUser);

  const [submitting, setSubmitting] = useState(false);

  const now = useClock();

  const handlePunch = async (action, successMessage) => {

    setSubmitting(true);

    try {

      const result = await action();

      if (result?.success) {
        toast.success(successMessage);
      } else {
        toast.error(result?.message || "Something went wrong.");
      }

    } catch (punchError) {

      console.error(punchError);
      toast.error("Something went wrong. Please try again.");

    } finally {

      setSubmitting(false);

    }

  };

  const cardClass = `flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`;

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-3 h-3 w-28 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-19 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <h2 className="text-xl font-semibold text-slate-900">
            My Attendance
          </h2>

          <p className="mt-1 truncate text-sm text-slate-500">
            {currentUser?.personalInfo?.name ||
              currentUser?.name ||
              "Signed in user"}
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
          <FiClock />
          {formatTime(now)}
        </div>

      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">

        {/* The badge renders a dash on its own when the day is not marked yet. */}
        <Stat
          label="Status"
          value={<AttendanceStatusBadge status={attendance?.status} />}
        />

        <Stat label="Punch In" value={formatTime(attendance?.punchIn)} />

        <Stat label="Punch Out" value={formatTime(attendance?.punchOut)} />

        <Stat
          label="Working Hours"
          value={attendance?.workingHours || "--"}
        />

      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        {!error && !employeeId && (
          <p className="text-sm text-slate-500">
            Punching in is available for employee accounts.
          </p>
        )}

        {!error && employeeId && !attendance && (
          <button
            type="button"
            onClick={() => handlePunch(punchIn, "Punched in successfully.")}
            disabled={submitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <FiLoader className="animate-spin" /> : <FiLogIn />}
            Punch In
          </button>
        )}

        {!error && employeeId && attendance && !attendance.punchOut && (
          <button
            type="button"
            onClick={() => handlePunch(punchOut, "Punched out successfully.")}
            disabled={submitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <FiLoader className="animate-spin" /> : <FiLogOut />}
            Punch Out
          </button>
        )}

        {!error && attendance?.punchOut && (
          <div className="flex items-center gap-2 font-semibold text-emerald-600">
            <FiCheckCircle />
            Attendance completed for today
          </div>
        )}

      </div>

    </div>
  );

}

export default TodayAttendanceCard;
