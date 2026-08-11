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

    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md">

      {/* Header */}

      <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-6">

        <h2 className="text-2xl font-semibold text-gray-800">
          Upcoming Holidays
        </h2>

        {canOpenCalendar && (

          <button
            type="button"
            onClick={() => navigate("/holidays")}
            className="group flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            View Calendar
            <FiArrowRight
              className="transition-transform group-hover:translate-x-0.5"
              size={16}
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

          <div className="max-h-76 space-y-2 overflow-y-auto px-4 pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">

            {holidays.map((holiday) => {

              const isNext = holiday.holidayId === next?.holidayId;

              const tone = toneFor(holiday);

              const { Icon } = tone;

              return (

                <div
                  key={holiday.holidayId}
                  className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors ${
                    isNext
                      ? "bg-blue-50"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >

                  {/* Date */}

                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white shadow-sm">

                    <span className="text-base font-bold leading-none text-slate-900">
                      {String(holiday.date).slice(8, 10)}
                    </span>

                    <span
                      className={`mt-1 text-[10px] font-bold uppercase leading-none tracking-wide ${
                        isNext ? tone.month : "text-slate-500"
                      }`}
                    >
                      {formatHolidayDate(holiday.date).slice(3, 6)}
                    </span>

                  </div>

                  {/* Type */}

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Name */}

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-[15px] font-bold text-slate-900">
                      {holiday.name}
                    </p>

                    <p className="mt-0.5 truncate text-sm text-slate-400">
                      {holidayLabel(holiday)}
                    </p>

                  </div>

                  {/* Countdown */}

                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                      isNext
                        ? "bg-blue-100 text-blue-700"
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

          <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">

            <FiCalendar size={16} className="shrink-0" />

            {holidays.length} upcoming{" "}
            {holidays.length === 1 ? "holiday" : "holidays"}

          </div>

        </>

      )}

    </div>

  );

}

export default UpcomingHolidayWidget;
