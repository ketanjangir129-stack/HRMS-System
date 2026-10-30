import { useRef } from "react";
import {
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiFlag,
  FiLoader,
  FiStar,
  FiSun,
  FiTrash2,
} from "react-icons/fi";
import { MdCelebration } from "react-icons/md";

import {
  HOLIDAY_IMAGE_ACCEPT,
  HOLIDAY_TYPE,
} from "../../../utils/holiday/holidayConstants";
import {
  formatDaysUntil,
  formatHolidayDate,
} from "../../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holiday Banner
|--------------------------------------------------------------------------
| One holiday drawn as a banner: a deep indigo panel carrying the date, the
| type, the name and the countdown, with the holiday's picture (diyas for
| Diwali, a flag for Independence Day) fading in from the right.
|
| The left of the banner stays a solid colour so the white text reads the
| same over any picture. A holiday without a picture gets a glow in its type
| colour and an oversized ghost of its icon instead, so a banner never looks
| empty.
|
| `featured` is the next holiday: taller, larger type. The rest of the list
| uses the compact size.
|
| The camera button is shown only when `canEditImage` is set, and changes the
| picture for every day of a multi-day holiday at once.
|--------------------------------------------------------------------------
*/

const BASE = "#1e1846";

const TYPE_STYLES = {
  [HOLIDAY_TYPE.NATIONAL]: { Icon: FiFlag, glow: "rgba(59,130,246,0.55)" },
  [HOLIDAY_TYPE.FESTIVAL]: { Icon: FiStar, glow: "rgba(245,158,11,0.55)" },
  [HOLIDAY_TYPE.COMPANY]: { Icon: FiBriefcase, glow: "rgba(139,92,246,0.6)" },
  [HOLIDAY_TYPE.EVENT]: { Icon: MdCelebration, glow: "rgba(236,72,153,0.55)" },
};

const OPTIONAL_STYLE = { Icon: FiSun, glow: "rgba(16,185,129,0.5)" };

const FALLBACK_STYLE = { Icon: FiCalendar, glow: "rgba(99,102,241,0.5)" };

const styleFor = (holiday) =>
  holiday?.isOptional
    ? OPTIONAL_STYLE
    : TYPE_STYLES[holiday?.type] || FALLBACK_STYLE;

/*
| "Festival Holiday", "Company Event", or "Restricted Holiday" when optional,
| because that day is not closed - it may only be taken.
*/

const holidayLabel = (holiday) => {

  if (holiday?.isOptional) return "Restricted Holiday";

  if (holiday?.type === HOLIDAY_TYPE.EVENT) return "Company Event";

  return holiday?.type ? `${holiday.type} Holiday` : "Holiday";

};

const countdownLabel = (days) => {

  const label = formatDaysUntil(days);

  return label.charAt(0).toUpperCase() + label.slice(1);

};

function HolidayBanner({
  holiday,
  featured = false,
  canEditImage = false,
  busy = false,
  onUploadImage,
  onRemoveImage,
}) {

  const inputRef = useRef(null);

  const { Icon, glow } = styleFor(holiday);

  const hasImage = Boolean(holiday?.imageUrl);

  const day = String(holiday?.date || "").slice(8, 10);
  const month = formatHolidayDate(holiday?.date).slice(3, 6);

  return (

    <div
      className={`group relative isolate flex items-center gap-3 overflow-hidden rounded-2xl text-white shadow-sm sm:gap-4 ${
        featured ? "min-h-[104px] px-4 py-5 sm:min-h-[120px] sm:px-6" : "min-h-[76px] px-3 py-3 sm:px-4"
      }`}
      style={{ backgroundColor: BASE }}
    >

      {/* Picture, or a glow in the type colour when there is none. */}

      {hasImage ? (
        <>
          <img
            src={holiday.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-y-0 right-0 -z-10 h-full w-[70%] object-cover sm:w-[62%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(90deg, ${BASE} 0%, ${BASE} 30%, rgba(30,24,70,0.82) 45%, rgba(30,24,70,0.25) 75%, rgba(30,24,70,0.1) 100%)`,
            }}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(circle at 85% 50%, ${glow} 0%, transparent 55%), radial-gradient(circle at 60% 120%, rgba(124,58,237,0.35) 0%, transparent 50%), linear-gradient(90deg, ${BASE} 0%, #2a1d63 100%)`,
            }}
          />
          <Icon
            aria-hidden="true"
            className={`pointer-events-none absolute -z-10 text-white/10 ${
              featured ? "-right-4 h-36 w-36" : "-right-3 h-24 w-24"
            }`}
          />
        </>
      )}

      {/* Date */}

      <div
        className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-md ${
          featured ? "h-16 w-16 sm:h-[72px] sm:w-[72px]" : "h-12 w-12"
        }`}
      >
        <span className={`font-bold leading-none ${featured ? "text-2xl sm:text-3xl" : "text-base"}`}>
          {day}
        </span>
        <span className={`mt-1 font-bold uppercase leading-none tracking-wide text-white/85 ${featured ? "text-xs" : "text-[10px]"}`}>
          {month}
        </span>
      </div>

      {/* Type */}

      <div
        className={`hidden shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-md min-[420px]:flex ${
          featured ? "h-14 w-14 sm:h-16 sm:w-16" : "h-11 w-11"
        }`}
      >
        <Icon size={featured ? 24 : 18} />
      </div>

      {/* Name */}

      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold ${featured ? "text-lg sm:text-2xl" : "text-[15px]"}`}>
          {holiday?.name}
        </p>
        <p className={`mt-0.5 truncate text-white/80 ${featured ? "text-sm sm:text-base" : "text-xs"}`}>
          {holidayLabel(holiday)}
        </p>
      </div>

      {/* Image controls - visible on hover, always on touch screens. */}

      {canEditImage && (

        <div
          className={`flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 ${
            busy ? "sm:opacity-100" : ""
          }`}
        >

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title={hasImage ? "Change image" : "Add image"}
            aria-label={hasImage ? `Change image for ${holiday?.name}` : `Add image for ${holiday?.name}`}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/40 backdrop-blur-md transition hover:bg-black/60 disabled:cursor-wait"
          >
            {busy ? <FiLoader className="animate-spin" size={13} /> : <FiCamera size={13} />}
          </button>

          {hasImage && !busy && (
            <button
              type="button"
              onClick={() => onRemoveImage?.(holiday)}
              title="Remove image"
              aria-label={`Remove image from ${holiday?.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/40 backdrop-blur-md transition hover:bg-red-600/80"
            >
              <FiTrash2 size={12} />
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={HOLIDAY_IMAGE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUploadImage?.(holiday, file);
            }}
          />

        </div>

      )}

      {/* Countdown */}

      <span
        className={`shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-black/30 font-semibold backdrop-blur-md ${
          featured ? "px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm" : "px-3 py-1 text-[11px]"
        }`}
      >
        {countdownLabel(holiday?.daysUntil)}
      </span>

    </div>

  );

}

export default HolidayBanner;
