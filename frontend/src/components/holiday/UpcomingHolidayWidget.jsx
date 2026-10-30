import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiSun,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";
import useHolidayImage from "../../hooks/useHolidayImage";
import useLiveUpcomingHolidays from "../../hooks/useLiveUpcomingHolidays";
import useRoleAccess from "../../hooks/useRoleAccess";
import HolidayBanner from "./common/HolidayBanner";

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
| Each holiday is a banner: date, type, name and countdown over the holiday's
| own picture. The next one is drawn larger, because "when is the next day
| off" is the question this card is actually asked.
|
| A role that can edit holidays sees a camera button on each banner to set
| the picture for that festival, event or holiday.
|--------------------------------------------------------------------------
*/

// Enough to fill the scroll with the months ahead without reading a whole
// year the card would never show.
const UPCOMING_LIMIT = 20;

function UpcomingHolidayWidget() {

  const navigate = useNavigate();

  const { company } = useAuth();

  const { canAccessPage, canAccessSection } = useRoleAccess();

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

  const { busyId, upload, remove } = useHolidayImage(companyCode, reload);

  /*
  | Calendar link sirf unhi ko jinke paas holiday page ka access hai. Baaki
  | sab ke liye wo link route guard tak le jaakar wapas bhej deta.
  */

  const canOpenCalendar = canAccessPage("holidays");

  const canEditImage = canAccessSection("holidays.edit");

  return (

    <div className="ui-card flex flex-col overflow-hidden">

      {/* Header */}

      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">

        <div className="min-w-0">

          <h2 className="ui-card-title">Upcoming Holidays</h2>

          <p className="ui-card-subtitle">The days the office is closed</p>

        </div>

        {canOpenCalendar && (

          <button
            type="button"
            onClick={() => navigate("/holidays")}
            className="group mt-1 flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700 sm:text-sm"
          >
            View Calendar
            <FiArrowRight
              className="transition-transform group-hover:translate-x-0.5"
              size={15}
            />
          </button>

        )}

      </div>

      {/* Loading */}

      {loading && (

        <div className="space-y-2 px-4 pb-4 sm:px-5">

          <div className="h-[104px] animate-pulse rounded-2xl bg-slate-200/80" />

          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-2xl bg-slate-100"
            />
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
          | with twenty holidays ahead does not stretch the dashboard row.
          */}

          <div className="ui-scroll max-h-88 space-y-2 overflow-y-auto px-4 pb-4 sm:px-5">

            {holidays.map((holiday, index) => (

              <HolidayBanner
                key={holiday.holidayId}
                holiday={holiday}
                featured={index === 0}
                canEditImage={canEditImage}
                busy={busyId === holiday.holidayId}
                onUploadImage={upload}
                onRemoveImage={remove}
              />

            ))}

          </div>

          {/* Footer */}

          <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5 text-xs font-medium text-slate-500 sm:px-6 sm:text-sm">

            <FiCalendar size={15} className="shrink-0" />

            {holidays.length} upcoming{" "}
            {holidays.length === 1 ? "holiday" : "holidays"}

          </div>

        </>

      )}

    </div>

  );

}

export default UpcomingHolidayWidget;
