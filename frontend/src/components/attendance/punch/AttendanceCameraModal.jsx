import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCamera,
  FiCheck,
  FiLoader,
  FiMapPin,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Attendance Camera
|--------------------------------------------------------------------------
| 1. getUserMedia opens the front camera and streams it into a <video>.
| 2. "Capture" draws the current video frame onto a hidden <canvas>,
|    downscaled to MAX_PHOTO_DIMENSION, and encodes it as a JPEG Blob.
| 3. The camera is released immediately after capture (the LED turns off).
| 4. "Confirm" hands the File to the card, which uploads it with the punch.
|
| The live preview is mirrored (like every selfie camera) but the saved
| photo is not, so it is a true picture of the person.
|--------------------------------------------------------------------------
*/

const MAX_PHOTO_DIMENSION = 960;
const PHOTO_QUALITY = 0.8;

const CAMERA_ERRORS = {
  NotAllowedError: "Camera permission was denied. Allow camera access in your browser and try again.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is being used by another application.",
  OverconstrainedError: "The requested camera settings are unavailable.",
  SecurityError: "Camera access needs a secure (HTTPS) connection.",
};

const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());

function LocationStatus({ status }) {
  const config = {
    pending: {
      icon: <FiLoader className="animate-spin" />,
      text: "Getting your location…",
      className: "text-ink-subtle",
    },
    ready: {
      icon: <FiMapPin />,
      text: "Location captured",
      className: "text-emerald-600 dark:text-emerald-400",
    },
    denied: {
      icon: <FiAlertCircle />,
      text: "Location unavailable — allow access to continue",
      className: "text-amber-600 dark:text-amber-400",
    },
  }[status];

  if (!config) return null;

  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium ${config.className}`} aria-live="polite">
      {config.icon}
      {config.text}
    </p>
  );
}

function AttendanceCameraModal({
  title,
  submitting,
  submitLabel,
  locationStatus,
  onClose,
  onConfirm,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  // { file, url } - the preview URL is made at capture time, freed on change.
  const [captured, setCaptured] = useState(null);
  const [cameraSession, setCameraSession] = useState(0);
  const [flash, setFlash] = useState(false);

  const capturedImage = captured?.file ?? null;

  useEffect(() => () => captured && URL.revokeObjectURL(captured.url), [captured]);

  const releaseCamera = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /*
   * Starts (or restarts) the camera. `cancelled` covers the permission prompt
   * resolving after the modal was closed, so a stream is never leaked.
   */
  useEffect(() => {
    if (capturedImage) return undefined;

    let cancelled = false;

    const startCamera = async () => {
      setCameraReady(false);
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is unavailable. Use HTTPS or localhost and try again.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stopTracks(stream);
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is not ready. Please try again.");

        video.srcObject = stream;
        await video.play();

        if (!cancelled) setCameraReady(true);
      } catch (error) {
        if (cancelled) return;
        releaseCamera();
        setCameraError(CAMERA_ERRORS[error?.name] || error?.message || "Unable to open the camera.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      releaseCamera();
    };
  }, [cameraSession, capturedImage, releaseCamera]);

  /* Esc closes; the page behind does not scroll while the modal is open. */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please try again.");
      return;
    }

    // Downscale before upload: smaller file → faster punch, same usefulness.
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to prepare the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to capture the photo. Please try again.");
          return;
        }

        const file = new File([blob], "attendance.jpg", { type: "image/jpeg", lastModified: Date.now() });
        setCaptured({ file, url: URL.createObjectURL(file) });
        setCameraError("");
        // The effect cleanup releases the camera as soon as a photo exists.
      },
      "image/jpeg",
      PHOTO_QUALITY
    );
  };

  const retakePhoto = () => {
    if (submitting) return;
    setCaptured(null);
  };

  const confirmPhoto = () => {
    if (capturedImage && !submitting) onConfirm(capturedImage);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-camera-title"
        className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-4 shadow-2xl transition duration-200 starting:translate-y-4 starting:opacity-0 sm:rounded-3xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="attendance-camera-title" className="text-base font-bold text-ink sm:text-lg">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-ink-subtle sm:text-sm">
              {capturedImage
                ? "Looks good? Confirm to save this photo."
                : "Position your face inside the frame and capture."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close camera"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-subtle transition hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <FiX size={19} />
          </button>
        </div>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
          {captured ? (
            <img
              src={captured.url}
              alt="Captured attendance photo"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-300 ${
                  cameraReady ? "opacity-100" : "opacity-0"
                }`}
              />

              {cameraReady && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
                />
              )}

              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
                  <FiLoader className="animate-spin text-2xl" />
                  <span className="text-sm">Opening camera…</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                  <FiAlertCircle className="text-3xl text-amber-400" />
                  <p role="alert" className="text-sm leading-relaxed">{cameraError}</p>
                </div>
              )}
            </>
          )}

          {flash && <div aria-hidden="true" className="absolute inset-0 bg-white" />}

          {submitting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 text-white backdrop-blur-[2px]">
              <FiLoader className="animate-spin text-2xl" />
              <span className="text-sm font-medium">{submitLabel}</span>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-3 min-h-5">
          <LocationStatus status={locationStatus} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={retakePhoto}
                disabled={submitting}
                className="ui-btn ui-btn-secondary min-h-11 order-2 sm:order-1"
              >
                <FiRefreshCw />
                Retake
              </button>

              <button
                type="button"
                onClick={confirmPhoto}
                disabled={submitting}
                autoFocus
                className="ui-btn ui-btn-primary min-h-11 order-1 font-semibold sm:order-2"
              >
                {submitting ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {submitting ? "Submitting…" : "Confirm"}
              </button>
            </>
          ) : cameraError ? (
            <button
              type="button"
              onClick={() => setCameraSession((session) => session + 1)}
              className="ui-btn ui-btn-primary min-h-11 font-semibold"
            >
              <FiRefreshCw />
              Try Again
            </button>
          ) : (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="ui-btn ui-btn-primary min-h-11 font-semibold"
            >
              <FiCamera />
              Capture Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceCameraModal;
