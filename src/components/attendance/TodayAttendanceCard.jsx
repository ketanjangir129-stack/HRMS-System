import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCoffee,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiPauseCircle,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import useAttendance from "../../hooks/useAttendance";
import useAuth from "../../hooks/useAuth";
import {
  APPROVAL_STATUS,
  ATTENDANCE_STATUS,
} from "../../utils/attendance/attendanceConstants";
import {
  formatTime,
  getDateKey,
} from "../../utils/attendance/attendanceDate";
import { getApprovalLabel } from "../../utils/attendance/attendanceUtils";
import {
  getDayName,
  isWeeklyOff,
} from "../../utils/holiday/holidayUtils";
import AttendanceStatusBadge from "./common/AttendanceStatusBadge";

/*
|--------------------------------------------------------------------------
| My Attendance Today
|--------------------------------------------------------------------------
| The signed in employee's punch in / punch out card. The record comes from a
| realtime subscription, so the card updates the moment a punch is written
| without a refresh.
|
| Which button is offered is decided by the punch times, not by whether a
| record exists. An approved leave writes the day in advance, so a day can
| already have a record that has never been punched: keying off the record
| would offer Punch Out to somebody who has not arrived yet.
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

/*
|--------------------------------------------------------------------------
| Approval Notice
|--------------------------------------------------------------------------
| Whether HR has signed today off yet, which is the second thing an employee
| opens this card to find out. Punching in records what they say happened; it
| is the approval that turns it into a day of attendance, so a day still
| sitting Pending is not counting towards their month and a day that was
| turned down needs a correction raised against it.
|
| A strip of its own under the stats rather than a fifth tile: two of the
| three states have something to say beyond their name - who signed the day
| off, or why it was refused - and that does not fit in a tile.
|--------------------------------------------------------------------------
*/

const APPROVAL_NOTICE = {

  [APPROVAL_STATUS.PENDING]: {
    icon: <FiPauseCircle />,
    title: "Waiting for approval",
    detail:
      "HR has not signed off today's attendance yet, so it is not counted as present.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    iconClassName: "text-amber-600",
  },

  /*
  | The only state with nothing to add: the day was signed off and counts,
  | which is the whole of it. A second line explaining that an approval means
  | approved is a line that exists to fill the box, and this card shares a row
  | with the summary cards - every line it grows is empty space handed to them.
  */
  [APPROVAL_STATUS.APPROVED]: {
    icon: <FiCheckCircle />,
    title: "Attendance approved",
    detail: "",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    iconClassName: "text-emerald-600",
  },

  [APPROVAL_STATUS.REJECTED]: {
    icon: <FiXCircle />,
    title: "Attendance rejected",
    detail:
      "Today was not approved, so it is not counted. Raise a correction request if this is wrong.",
    className: "border-red-200 bg-red-50 text-red-800",
    iconClassName: "text-red-600",
  },

};

function ApprovalNotice({ record }) {

  const notice = APPROVAL_NOTICE[getApprovalLabel(record)];

  if (!notice) return null;

  /*
  | The reviewer's own words whenever there are any: a rejection always
  | carries a remark, and it says more than the generic line ever can.
  */
  const detail = record?.approvalRemarks || notice.detail;

  return (
    /*
    | One line unless there is a second thing to say, and no taller at any
    | width. The card shares a stretching row with the summary cards on the
    | dashboard, so every pixel it grows is a pixel of empty space handed to
    | the four cards beside it.
    |
    | With one line the icon centres against it; with two it aligns to the
    | first, so it sits beside the heading rather than floating between them.
    */
    <div
      className={`mt-4 flex gap-2.5 rounded-xl border px-3 py-2.5 sm:px-4 ${detail ? "items-start" : "items-center"} ${notice.className}`}
    >

      <span
        className={`shrink-0 text-base ${detail ? "mt-0.5" : ""} ${notice.iconClassName}`}
      >
        {notice.icon}
      </span>

      <div className="min-w-0">

        <p className="text-sm font-semibold">{notice.title}</p>

        {detail && (
          <p className="mt-0.5 wrap-break-word text-xs leading-snug opacity-90">
            {detail}
          </p>
        )}

      </div>

    </div>
  );

}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">

      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <div className="mt-1.5 flex h-7 items-center whitespace-nowrap text-base font-semibold text-slate-900 sm:mt-2 sm:text-lg">
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

  /*
  | A full day of approved leave is not worked at all, so the day is reported
  | rather than offered a punch. A half day still is, so it falls through to
  | the normal punch in / punch out flow on the record the approval created.
  */

  const onApprovedLeave =
    attendance?.status === ATTENDANCE_STATUS.LEAVE;

  /*
  | Sunday, unless the company works a different week. Read off the clock
  | rather than memoised, so a card left open overnight stops offering the
  | punch the moment the day rolls over into the weekly off.
  */

  const todayKey = getDateKey(now);

  const onWeeklyOff = isWeeklyOff(todayKey);

  /*
  | A weekly off is not worked, so no punch in is offered for it.
  |
  | The punch out is left alone on purpose. Somebody who is already punched in
  | on a weekly off - a day an approver marked by hand, or a punch made before
  | this rule existed - would otherwise be stranded with an open record that
  | nothing can close.
  */

  const canPunchIn =
    !onApprovedLeave && !onWeeklyOff && !attendance?.punchIn;

  const canPunchOut =
    !onApprovedLeave &&
    Boolean(attendance?.punchIn) &&
    !attendance?.punchOut;

  /*
  | The day has a record of its own once anything has been punched or marked,
  | and that is the truer description of it than the weekly off is.
  */

  const showWeeklyOffNotice =
    onWeeklyOff && !onApprovedLeave && !attendance?.punchIn;

  const cardClass = `flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`;

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-3 h-3 w-28 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
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

      <div className="flex items-start justify-between gap-3 sm:gap-4">

        <div className="min-w-0">

          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            My Attendance
          </h2>

          <p className="mt-1 truncate text-sm text-slate-500">
            {currentUser?.personalInfo?.name ||
              currentUser?.name ||
              "Signed in user"}
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-500 sm:px-3 sm:text-sm">
          <FiClock />
          {formatTime(now)}
        </div>

      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">

        {/*
        | The badge renders a dash on its own when the day is not marked yet.
        | An unmarked weekly off is not unmarked so much as not expected, so it
        | says so rather than showing the same dash a working day shows before
        | anybody arrives.
        */}
        <Stat
          label="Status"
          value={
            <AttendanceStatusBadge
              status={
                attendance?.status ||
                (onWeeklyOff ? ATTENDANCE_STATUS.WEEKLY_OFF : null)
              }
            />
          }
        />

        <Stat label="Punch In" value={formatTime(attendance?.punchIn)} />

        <Stat label="Punch Out" value={formatTime(attendance?.punchOut)} />

        <Stat
          label="Working Hours"
          value={attendance?.workingHours || "--"}
        />

      </div>

      {/*
      | A full day of approved leave already says so in its own line below, and
      | saying "approved" twice about the same day reads as two different
      | approvals rather than one.
      */}
      {!onApprovedLeave && <ApprovalNotice record={attendance} />}

      <div className="mt-5 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        {!error && !employeeId && (
          <p className="text-sm text-slate-500">
            Punching in is available for employee accounts.
          </p>
        )}

        {!error && employeeId && onApprovedLeave && (
          <div className="flex items-center gap-2 font-semibold text-blue-600">
            <FiCalendar />
            You are on approved leave today
          </div>
        )}

        {!error && employeeId && showWeeklyOffNotice && (
          <div className="flex items-center gap-2 font-semibold text-indigo-600">
            <FiCoffee />
            Today is {getDayName(todayKey)}, enjoy your day
          </div>
        )}

        {!error && employeeId && canPunchIn && (
          <button
            type="button"
            onClick={() => handlePunch(punchIn, "Punched in successfully.")}
            disabled={submitting}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
          >
            {submitting ? <FiLoader className="animate-spin" /> : <FiLogIn />}
            Punch In
          </button>
        )}

        {!error && employeeId && canPunchOut && (
          <button
            type="button"
            onClick={() => handlePunch(punchOut, "Punched out successfully.")}
            disabled={submitting}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
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
