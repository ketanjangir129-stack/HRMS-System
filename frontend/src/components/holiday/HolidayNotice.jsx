import { FiInfo } from "react-icons/fi";
import {
  formatHolidayDateWithDay,
} from "../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "./common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Holiday Notice
|--------------------------------------------------------------------------
| The banner the attendance screens show when the day being looked at is a
| declared holiday.
|
| Without it the numbers below would look wrong: nobody punched in, nobody is
| marked absent, and there would be nothing on the page explaining why. It is
| the one line that makes an empty attendance day read as expected rather
| than as broken.
|
| Renders nothing when there is no holiday, so a page can drop it in
| unconditionally instead of wrapping it in a check of its own.
|--------------------------------------------------------------------------
*/

function HolidayNotice({
  holiday,
  label = "This day",
}) {

  if (!holiday) return null;

  return (

    <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex min-w-0 items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm">
          <FiInfo />
        </div>

        <div className="min-w-0">

          <p className="text-sm font-semibold text-teal-900">
            {label} is a holiday · {holiday.name}
          </p>

          <p className="mt-0.5 text-xs text-teal-700">
            {formatHolidayDateWithDay(holiday.date)}
            {holiday.isOptional
              ? " · Optional, employees may still work"
              : " · Nobody is marked absent for this day"}
          </p>

        </div>

      </div>

      <div className="shrink-0 pl-13 sm:pl-0">
        <HolidayTypeBadge
          type={holiday.type}
          isOptional={holiday.isOptional}
          size="sm"
        />
      </div>

    </div>

  );

}

export default HolidayNotice;
