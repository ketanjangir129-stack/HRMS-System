import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiFlag,
  FiStar,
  FiSun,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";
import useLiveUpcomingHolidays from "../../hooks/useLiveUpcomingHolidays";
import useRoleAccess from "../../hooks/useRoleAccess";
import { HOLIDAY_TYPE } from "../../utils/holiday/holidayConstants";
import {
  formatDaysUntil,
  formatHolidayDate,
} from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays (Dashboard card)
|--------------------------------------------------------------------------
| The days the office is closed, nearest first.
|
| Everyone plans around the next day off, so the list is shown in full here
| rather than behind a link to /holidays, which only a few roles can open at
| all.
|
| A row is read left to right as a sentence: the date, what kind of day it is,
| its name, and how far away it is. The date leads because that is the thing
| being looked up, and the countdown closes because that is what decides
| whether it matters this week.
|
| The colour of a row is its type, taken from the same palette the holiday
| badges use, so a National day looks the same here as it does on the holiday
| screen.
|--------------------------------------------------------------------------
*/

// Enough to fill the scroll with the months ahead without reading a whole
// year the card would never show.
const UPCOMING_LIMIT = 20;

/*
| Type ke hisaab se icon aur rang. Optional holiday apna alag rang leta hai:
| daftar band hone aur chhutti le sakne ka farq type se zyada matter karta
| hai, isliye wahi row par dikhta hai.
*/

const TYPE_TONES = {

  [HOLIDAY_TYPE.NATIONAL]: {
    Icon: FiFlag,
    tile: "bg-blue-50 text-blue-600",
    month: "text-blue-600",
  },

  [HOLIDAY_TYPE.FESTIVAL]: {
    Icon: FiStar,
    tile: "bg-amber-50 text-amber-600",
    month: "text-amber-600",
  },

  [HOLIDAY_TYPE.COMPANY]: {
    Icon: FiBriefcase,
    tile: "bg-violet-50 text-violet-600",
    month: "text-violet-600",
  },

};

const OPTIONAL_TONE = {
  Icon: FiSun,
  tile: "bg-emerald-50 text-emerald-600",
  month: "text-emerald-600",
};

const FALLBACK_TONE = {
  Icon: FiCalendar,
  tile: "bg-slate-100 text-slate-500",
  month: "text-slate-500",
};

const toneFor = (holiday) => {

  if (holiday?.isOptional) return OPTIONAL_TONE;

  return TYPE_TONES[holiday?.type] || FALLBACK_TONE;

};

/*
| "National Holiday", ya optional hone par "Restricted Holiday" — kyunki wo
| din band nahi hota, sirf lena ho to liya ja sakta hai.
*/

const holidayLabel = (holiday) => {

  if (holiday?.isOptional) return "Restricted Holiday";

  return holiday?.type ? `${holiday.type} Holiday` : "Holiday";

};

// "in 3 days" row ke shuru mein "In 3 days" padha jaata hai.
const countdownLabel = (days) => {

  const label = formatDaysUntil(days);

  return label.charAt(0).toUpperCase() + label.slice(1);

};

function UpcomingHolidayWidget() {

  const navigate = useNavigate();

  const { company } = useAuth();

  const { canAccessPage } = useRoleAccess();

  const companyCode =
    company?.companyCode || localStorage.getItem("companyCode");

  /*
  | Live rather than read once: the dashboard is left open all day, and a
  | holiday added or removed anywhere in the company lands here on its own.
  */

  const { holidays, loading, error, reload } = useLiveUpcomingHolidays(
    companyCode,
    UPCOMING_LIMIT
  );

  /*
  | Calendar link sirf unhi ko jinke paas holiday page ka access hai. Baaki
  | sab ke liye wo link route guard tak le jaakar wapas bhej deta.
  */

  const canOpenCalendar = canAccessPage("holidays");

  const next = holidays[0];

  return (

    <div className="ui-card flex flex-col overflow-hidden">

      {/* Header */}

      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">

        <div className="min-w-0">

          <h2 className="ui-card-title">Upcoming Holidays</h2>

          <p className="ui-card-subtitle">The days the office is closed</p>

        </div>

        {canOpenCalendar && (

          <button
            type="button"
            onClick={() => navigate("/holidays")}
            className="group flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            View Calendar
            <FiArrowRight
              className="transition-transform group-hover:translate-x-0.5"
              size={14}
            />
          </button>

        )}

      </div>

      {/* Loading */}

      {loading && (

        <div className="space-y-2 px-4 pb-4">

          {Array.from({ length: 4 }).map((_, index) => (

            <div
              key={index}
              className="flex items-center gap-4 rounded-xl bg-slate-50 px-3 py-3"
            >

              <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white" />

              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-100" />

              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded-md bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded-md bg-slate-100" />
              </div>

              <div className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-slate-100" />

            </div>

          ))}

        </div>

      )}

      {/* Error */}

      {!loading && error && (

        <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">

          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <FiAlertTriangle className="h-6 w-6 text-red-500" />
          </span>

          <div>
            <p className="font-medium text-gray-700">
              Unable to load holidays
            </p>
            <p className="mt-1 text-sm text-gray-400">{error}</p>
          </div>

          <button
            onClick={reload}
            className="mt-1 cursor-pointer text-sm font-medium text-blue-600 transition hover:underline"
          >
            Try again
          </button>

        </div>

      )}

      {/* Empty */}

      {!loading && !error && holidays.length === 0 && (

        <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">

          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <FiSun className="h-6 w-6 text-blue-500" />
          </span>

          <div>
            <p className="font-medium text-gray-700">No upcoming holidays</p>
            <p className="mt-1 text-sm text-gray-400">
              Holidays declared for the coming days will appear here.
            </p>
          </div>

        </div>

      )}

      {/* The list */}

      {!loading && !error && holidays.length > 0 && (

        <>

          {/*
          | The scroll is capped rather than sized to the content, so a company
          | with twenty holidays ahead does not stretch the dashboard row. Four
          | rows are visible, and the fifth peeking under the fold is what says
          | there is more to scroll to.
          */}

          <div className="ui-scroll max-h-76 space-y-2 overflow-y-auto px-4 pb-2 sm:px-5">

            {holidays.map((holiday) => {

              const isNext = holiday.holidayId === next?.holidayId;

              const tone = toneFor(holiday);

              const { Icon } = tone;

              return (

                /*
                | The next one is the answer to the question the card is
                | actually asked - "when is the next day off" - so it is
                | drawn as a filled brand panel and the rest of the list
                | recedes to quiet rows behind it. A tint alone was not
                | enough separation once the whole app went indigo.
                */
                <div
                  key={holiday.holidayId}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 transition-colors sm:gap-4 ${
                    isNext
                      ? "bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-md"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >

                  {/* An oversized ghost of the type glyph, bled off the
                      corner. Decoration only, so it is hidden from the
                      reader rather than announced twice. */}
                  {isNext && (
                    <Icon
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-6 -right-5 h-28 w-28 opacity-10"
                    />
                  )}

                  {/* Date */}

                  <div
                    className={`relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
                      isNext
                        ? "border border-white/20 bg-white/10 backdrop-blur-md"
                        : "bg-white shadow-sm"
                    }`}
                  >

                    <span
                      className={`text-base font-bold leading-none ${
                        isNext ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {String(holiday.date).slice(8, 10)}
                    </span>

                    <span
                      className={`mt-1 text-[10px] font-bold uppercase leading-none tracking-wide ${
                        isNext ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {formatHolidayDate(holiday.date).slice(3, 6)}
                    </span>

                  </div>

                  {/* Type - the tinted tile only reads on a white row, so on
                      the filled one the glyph carries the type by itself. */}

                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isNext
                        ? "border border-white/20 bg-white/10 text-white"
                        : tone.tile
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Name */}

                  <div className="relative min-w-0 flex-1">

                    <p
                      className={`truncate text-[15px] font-bold ${
                        isNext ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {holiday.name}
                    </p>

                    <p
                      className={`mt-0.5 truncate text-xs ${
                        isNext ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {holidayLabel(holiday)}
                    </p>

                  </div>

                  {/* Countdown */}

                  <span
                    className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isNext
                        ? "bg-black/15 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {countdownLabel(holiday.daysUntil)}
                  </span>

                </div>

              );

            })}

          </div>

          {/* Footer */}

          <div className="mt-2 flex items-center gap-2 border-t border-slate-100 px-5 py-3.5 text-xs font-medium text-slate-500 sm:px-6">

            <FiCalendar size={14} className="shrink-0" />

            {holidays.length} upcoming{" "}
            {holidays.length === 1 ? "holiday" : "holidays"}

          </div>

        </>

      )}

    </div>

  );

}

export default UpcomingHolidayWidget;
