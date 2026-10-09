import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCoffee,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiSun,
} from "react-icons/fi";
import { toast } from "react-toastify";

import useAttendance, { PUNCH_TYPE } from "../../hooks/useAttendance";
import useAuth from "../../hooks/useAuth";
import { ATTENDANCE_STATUS } from "../../utils/attendance/attendanceConstants";
import { formatTime, getAttendanceDateKey } from "../../utils/attendance/attendanceDate";
import { getPunchLocation } from "../../utils/attendance/attendanceLocation";
import { getDayName, isWeeklyOff } from "../../utils/holiday/holidayUtils";
import AttendanceCameraModal from "./punch/AttendanceCameraModal";
import AttendancePhotoTile from "./punch/AttendancePhotoTile";

/*
|--------------------------------------------------------------------------
| Today's Attendance
|--------------------------------------------------------------------------
| Each fact is shown exactly once:
|   header pill  → live status (Working / Late)
|   punch photos → photo, and the time of each punch under it
|   footer       → the one action available now, or the day's message
|
| Flow of a punch:
|   button → camera opens AND GPS lookup starts (in parallel)
|          → capture → confirm → upload with the punch
|          → realtime listener delivers the saved fields → card updates
| A retake skips GPS: it only replaces the photo, never the punch time.
|--------------------------------------------------------------------------
*/

const CLOCK_INTERVAL = 30 * 1000;

const MODE = Object.freeze({ PUNCH: "punch", RETAKE: "retake" });

// Two photos side by side. `flex-1` lets the row absorb whatever height the
// card has (it is stretched to match the calendar), so no gap is left behind.
const PHOTO_GRID = "mb-5 mt-5 grid w-full flex-1 grid-cols-2 gap-5 sm:gap-6";

const PUNCH_COPY = {
  [PUNCH_TYPE.IN]: { title: "Punch In", done: "Punched in" },
  [PUNCH_TYPE.OUT]: { title: "Punch Out", done: "Punched out" },
};

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function StatusPill({ tone, pulse = false, children }) {
  const styles = {
    working: ["bg-blue-500/10 text-blue-600 dark:text-blue-400", "bg-blue-500"],
    warn: ["bg-amber-500/10 text-amber-600 dark:text-amber-400", "bg-amber-500"],
  };
  const [pill, dot] = styles[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pill}`}>
      <span className="relative flex h-2 w-2">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {children}
    </span>
  );
}

function Notice({ tone, icon, children }) {
  const tones = {
    info: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    error: "bg-red-500/10 text-red-600 dark:text-red-400",
    muted: "bg-surface-muted text-ink-subtle",
  };

  return (
    <p role={tone === "error" ? "alert" : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${tones[tone]}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </p>
  );
}

function CardSkeleton({ className }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading attendance">
      <div className="space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-raised" />
        <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className={PHOTO_GRID}>
        {[0, 1].map((item) => (
          <div key={item} className="flex flex-col">
            <div className="min-h-36 flex-1 animate-pulse rounded-xl bg-surface-muted sm:min-h-44" />
            <div className="mt-2.5 flex justify-between">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-surface-raised" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto h-10 animate-pulse rounded-xl bg-surface-raised" />
    </div>
  );
}

function TodayAttendanceCard({ className = "" }) {
  const { company, currentUser } = useAuth();
  const { attendance, loading, error, employeeId, punch, retakePhoto } = useAttendance(
    company?.companyCode,
    currentUser
  );

  const now = useClock();

  // { type: "in"|"out", mode: "punch"|"retake", staleUrl } - plain data only.
  // (Storing the punch FUNCTION in state was the original punch-out bug.)
  const [camera, setCamera] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [localPreviews, setLocalPreviews] = useState({});

  const locationRef = useRef(null);
  const locationSession = useRef(0);
  const previewUrls = useRef([]);

  // Free the captured-photo object URLs when the card unmounts.
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const requestLocation = useCallback(() => {
    const session = ++locationSession.current;
    setLocationStatus("pending");

    const promise = getPunchLocation().then((position) => {
      if (session === locationSession.current) {
        setLocationStatus(position ? "ready" : "denied");
      }
      return position;
    });

    locationRef.current = promise;
    return promise;
  }, []);

  const photoUrlOf = (type) =>
    attendance?.images?.[type === PUNCH_TYPE.IN ? "punchIn" : "punchOut"]?.url || "";

  const openPunch = (type) => {
    if (submitting) return;
    setCamera({ type, mode: MODE.PUNCH, staleUrl: "" });
    // Start GPS now so it resolves while the user is framing the photo.
    requestLocation();
  };

  const openRetake = (type) => {
    if (submitting) return;
    locationSession.current += 1; // ignore any in-flight lookup
    setLocationStatus("idle");
    setCamera({ type, mode: MODE.RETAKE, staleUrl: photoUrlOf(type) });
  };

  const closeCamera = useCallback(() => {
    if (!submitting) setCamera(null);
  }, [submitting]);

  const showLocalPreview = (type, image, staleUrl) => {
    const url = URL.createObjectURL(image);
    previewUrls.current.push(url);
    setLocalPreviews((previews) => ({ ...previews, [type]: { url, staleUrl } }));
  };

  const submitPhoto = async (image) => {
    if (!camera) return;
    const { type, mode, staleUrl } = camera;

    setSubmitting(true);

    try {
      if (mode === MODE.RETAKE) {
        setSubmitLabel("Updating photo…");
        const result = await retakePhoto(type, image);

        if (!result?.success) {
          toast.error(result?.message || "Could not update the photo.");
          return;
        }

        showLocalPreview(type, image, staleUrl);
        toast.success(`${PUNCH_COPY[type].title} photo updated.`);
        setCamera(null);
        return;
      }

      setSubmitLabel("Verifying location…");
      // Usually resolved already; retry once if it was denied or timed out.
      const position = (await locationRef.current) || (await requestLocation());

      if (!position) {
        toast.error(`Location access is required to ${PUNCH_COPY[type].title.toLowerCase()}.`);
        return;
      }

      setSubmitLabel("Uploading photo…");
      const result = await punch(type, image, position);

      if (!result?.success) {
        toast.error(result?.message || "Attendance punch failed.");
        return;
      }

      showLocalPreview(type, image, "");

      const savedTime =
        type === PUNCH_TYPE.IN ? result.attendance?.punchInTime : result.attendance?.punchOutTime;

      toast.success(`${PUNCH_COPY[type].done}${savedTime ? ` at ${savedTime}` : ""}.`);
      setCamera(null);
    } catch (submitError) {
      console.error("Attendance photo submit failed:", submitError);
      toast.error(submitError?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setSubmitLabel("");
    }
  };

  const cardClass = `ui-card ui-card-body flex flex-col ${className}`;

  if (loading) return <CardSkeleton className={cardClass} />;

  /* Derived day state */
  const todayKey = getAttendanceDateKey(now);
  const onApprovedLeave = attendance?.status === ATTENDANCE_STATUS.LEAVE;
  const onWeeklyOff = isWeeklyOff(todayKey);
  const punchedIn = Boolean(attendance?.punchIn);
  const punchedOut = Boolean(attendance?.punchOut);
  const isLate = attendance?.status === ATTENDANCE_STATUS.LATE;

  const canAct = !error && Boolean(employeeId) && !submitting;
  const canPunchIn = canAct && !onApprovedLeave && !onWeeklyOff && !punchedIn;
  const canPunchOut = canAct && !onApprovedLeave && punchedIn && !punchedOut;

  const punchInTime = punchedIn ? attendance.punchInTime || formatTime(attendance.punchIn) : "";
  const punchOutTime = punchedOut ? attendance.punchOutTime || formatTime(attendance.punchOut) : "";

  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const timeLabel = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cardClass}>
      {/* Header: same anatomy as the calendar card - title, caption, status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ui-card-title">Today's Attendance</h2>
          <p className="ui-card-subtitle truncate tabular-nums">
            {dateLabel} · {timeLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {isLate && <StatusPill tone="warn">Late</StatusPill>}
          {punchedIn && !punchedOut ? (
            <StatusPill tone="working" pulse>Working</StatusPill>
          ) : null}
        </div>
      </div>

      {/* Punch photos: time under each, retake icon on each recorded photo */}
      <div className={PHOTO_GRID}>
        <AttendancePhotoTile
          label="Punch In"
          tone="in"
          time={punchInTime}
          imageUrl={photoUrlOf(PUNCH_TYPE.IN)}
          localPreview={localPreviews[PUNCH_TYPE.IN]}
          canCapture={canPunchIn}
          onCapture={() => openPunch(PUNCH_TYPE.IN)}
          canRetake={canAct && punchedIn}
          onRetake={() => openRetake(PUNCH_TYPE.IN)}
        />
        <AttendancePhotoTile
          label="Punch Out"
          tone="out"
          time={punchOutTime}
          imageUrl={photoUrlOf(PUNCH_TYPE.OUT)}
          localPreview={localPreviews[PUNCH_TYPE.OUT]}
          canCapture={canPunchOut}
          onCapture={() => openPunch(PUNCH_TYPE.OUT)}
          canRetake={canAct && punchedOut}
          onRetake={() => openRetake(PUNCH_TYPE.OUT)}
        />
      </div>

      {/* Footer: the one action available right now pinned to the bottom so both cards align */}
      {error ? (
        <div className="mt-auto"><Notice tone="error" icon={<FiAlertCircle />}>{error}</Notice></div>
      ) : !employeeId ? (
        <div className="mt-auto"><Notice tone="muted">Attendance punching is available for employee accounts.</Notice></div>
      ) : onApprovedLeave ? (
        <div className="mt-auto"><Notice tone="info" icon={<FiSun />}>You are on approved leave today.</Notice></div>
      ) : punchedOut ? (
        <div className="mt-auto">
          <Notice tone="success" icon={<FiCheckCircle />}>Attendance completed for today. See you tomorrow!</Notice>
        </div>
      ) : punchedIn ? (
        <button
          type="button"
          onClick={() => openPunch(PUNCH_TYPE.OUT)}
          disabled={!canPunchOut}
          className="ui-btn ui-btn-primary mt-auto w-full font-semibold"
        >
          {submitting ? <FiLoader className="animate-spin" /> : <FiLogOut />}
          Punch Out
        </button>
      ) : onWeeklyOff ? (
        <div className="mt-auto"><Notice tone="info" icon={<FiCoffee />}>Today is {getDayName(todayKey)} — enjoy your day off.</Notice></div>
      ) : (
        <button
          type="button"
          onClick={() => openPunch(PUNCH_TYPE.IN)}
          disabled={!canPunchIn}
          className="ui-btn ui-btn-primary mt-auto w-full font-semibold"
        >
          {submitting ? <FiLoader className="animate-spin" /> : <FiLogIn />}
          Punch In
        </button>
      )}

      {camera && (
        <AttendanceCameraModal
          title={`${camera.mode === MODE.RETAKE ? "Retake " : ""}${PUNCH_COPY[camera.type].title} Photo`}
          submitting={submitting}
          submitLabel={submitLabel}
          locationStatus={locationStatus}
          onClose={closeCamera}
          onConfirm={submitPhoto}
        />
      )}
    </div>
  );
}

export default TodayAttendanceCard;
