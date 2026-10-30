import { FiSun } from "react-icons/fi";
import { AttendancePanel } from "../attendance/common/AttendancePanel";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../attendance/common/AttendanceState";
import useHolidayImage from "../../hooks/useHolidayImage";
import { formatDaysUntil } from "../../utils/holiday/holidayUtils";
import HolidayBanner from "./common/HolidayBanner";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays
|--------------------------------------------------------------------------
| The next holidays from today onwards, nearest first, so the day everyone is
| planning around is visible without reading the table below.
|
| The list crosses the year boundary: in December the next holiday is usually
| in January, and a panel that stopped at the 31st would be empty exactly
| when it is most useful.
|
| Drawn with the same banners as the Dashboard card. The first is larger,
| because "the next holiday" is the one question this panel is opened to
| answer. A role that can edit holidays can set each banner's picture here.
|--------------------------------------------------------------------------
*/

function UpcomingHolidayCard({
  companyCode,
  holidays = [],
  loading = false,
  error = "",
  onRetry,
  canEditImage = false,
  onImageChanged,
}) {

  const [next] = holidays;

  const { busyId, upload, remove } = useHolidayImage(
    companyCode,
    onImageChanged
  );

  return (

    <AttendancePanel
      title="Upcoming Holidays"
      subtitle={
        next
          ? `${next.name} is ${formatDaysUntil(next.daysUntil).toLowerCase()}`
          : "The next days the office is closed"
      }
      action={
        <span className="ui-badge bg-blue-50 text-blue-700">
          {holidays.length} Upcoming
        </span>
      }
      className="h-full"
    >

      {loading && <TableSkeleton rows={3} />}

      {!loading && error && (
        <ErrorState message={error} onRetry={onRetry} />
      )}

      {!loading && !error && holidays.length === 0 && (

        <EmptyState
          icon={<FiSun size={28} />}
          title="No Upcoming Holidays"
          message="Holidays declared for the coming days will appear here."
        />

      )}

      {!loading && !error && holidays.length > 0 && (

        <div className="ui-scroll max-h-[440px] space-y-2.5 overflow-y-auto p-4 sm:p-5">

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

      )}

    </AttendancePanel>

  );

}

export default UpcomingHolidayCard;
