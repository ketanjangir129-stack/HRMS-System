import { useEffect, useState } from "react";
import { FiAlertCircle, FiCamera, FiRefreshCw, FiX } from "react-icons/fi";

import { getAttendancePhotoUrl, PHOTO_PRESETS } from "../../../utils/attendance/attendanceImage";

/*
|--------------------------------------------------------------------------
| Punch Photo
|--------------------------------------------------------------------------
| One punch (in or out): the photo, and under it the label and the time.
| No border of its own - it sits inside the card, which already has one.
|
|  - The photo is a square, face-cropped CDN thumbnail (WebP/AVIF), loaded
|    eagerly because it is above the fold.
|  - Right after a punch or retake, the photo just captured on this device
|    (`localPreview.url`) shows instantly until the new CDN copy has loaded.
|  - The icon button in the corner retakes the photo; tapping the photo
|    opens it full size.
|--------------------------------------------------------------------------
*/

const DOTS = {
  in: "bg-emerald-500",
  out: "bg-amber-500",
};

function PhotoLightbox({ src, title, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0"
    >
      <button
        type="button"
        aria-label="Close photo"
        onClick={onClose}
        className="ui-icon-btn absolute right-4 top-4 bg-white/10 text-white hover:bg-white/20"
      >
        <FiX size={20} />
      </button>

      <figure onClick={(event) => event.stopPropagation()} className="flex max-w-md flex-col items-center gap-3">
        <img
          src={src}
          alt={title}
          className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl transition duration-200 starting:scale-95"
        />
        <figcaption className="text-sm font-medium text-white/80">{title}</figcaption>
      </figure>
    </div>
  );
}

function AttendancePhotoTile({
  label,
  tone,
  time,
  imageUrl,
  localPreview,
  canCapture,
  onCapture,
  canRetake,
  onRetake,
}) {
  const [loadedUrl, setLoadedUrl] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const thumbUrl = getAttendancePhotoUrl(imageUrl, PHOTO_PRESETS.THUMB);
  const remoteLoaded = Boolean(thumbUrl) && loadedUrl === thumbUrl;
  const remoteFailed = Boolean(thumbUrl) && failedUrl === thumbUrl;

  // The local capture stays on top until the NEW remote photo has loaded.
  const showLocal =
    Boolean(localPreview?.url) &&
    (!remoteLoaded || (Boolean(localPreview.staleUrl) && imageUrl === localPreview.staleUrl));

  const hasPhoto = Boolean(thumbUrl || localPreview?.url);

  // Fills the height the card gives it, with a floor for unstretched layouts.
  const frame = "relative min-h-36 w-full flex-1 overflow-hidden rounded-xl sm:min-h-44";

  return (
    <figure className="flex min-w-0 flex-col">
      <div className="relative flex flex-1 flex-col">
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => thumbUrl && setLightboxOpen(true)}
            aria-label={`View ${label.toLowerCase()} photo`}
            className={`${frame} group block bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
          >
            {!remoteLoaded && !showLocal && !remoteFailed && (
              <span className="absolute inset-0 animate-pulse bg-surface-raised" />
            )}

            {remoteFailed && !showLocal && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-faint">
                <FiAlertCircle size={20} />
                <span className="text-xs">Photo unavailable</span>
              </span>
            )}

            {thumbUrl && (
              <img
                key={thumbUrl}
                src={thumbUrl}
                alt={`${label} photo`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
                onLoad={() => setLoadedUrl(thumbUrl)}
                onError={() => setFailedUrl(thumbUrl)}
                className={`absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
                  remoteLoaded && !showLocal ? "opacity-100" : "opacity-0"
                }`}
              />
            )}

            {showLocal && (
              <img src={localPreview.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </button>
        ) : canCapture ? (
          <button
            type="button"
            onClick={onCapture}
            aria-label={`Capture ${label.toLowerCase()} photo`}
            className={`${frame} group flex flex-col items-center justify-center gap-2.5 bg-brand/5 transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-sm transition group-hover:scale-105">
              <FiCamera size={20} />
            </span>
            <span className="text-xs font-medium text-brand">Tap to capture</span>
          </button>
        ) : (
          <div className={`${frame} flex flex-col items-center justify-center gap-2.5 bg-surface-muted`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-ink-faint">
              <FiCamera size={20} />
            </span>
            <span className="text-xs text-ink-faint">Not recorded yet</span>
          </div>
        )}

        {canRetake && (
          <button
            type="button"
            onClick={onRetake}
            aria-label={`Retake ${label.toLowerCase()} photo`}
            title="Retake photo"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface/90 text-ink-muted shadow-sm backdrop-blur transition hover:bg-surface hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <FiRefreshCw size={15} />
          </button>
        )}
      </div>

      <figcaption className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-subtle">
          <span className={`h-2 w-2 shrink-0 rounded-full ${DOTS[tone]}`} />
          <span className="truncate">{label}</span>
        </span>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${time ? "text-ink" : "text-ink-faint"}`}>
          {time || "--:--"}
        </span>
      </figcaption>

      {lightboxOpen && (
        <PhotoLightbox
          src={getAttendancePhotoUrl(imageUrl, PHOTO_PRESETS.FULL)}
          title={`${label} · ${time}`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

export default AttendancePhotoTile;
