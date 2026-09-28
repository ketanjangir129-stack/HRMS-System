import { FiCoffee } from "react-icons/fi";
import {
  formatHolidayDateWithDay,
  getDayName,
  isWeeklyOff,
} from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Weekly Off Notice
|--------------------------------------------------------------------------
| The banner the attendance screens show when the day being looked at is a
| weekly off - Sunday, unless the company works a different week.
|
| It exists for the same reason `HolidayNotice` does: without it the screen
| below is an empty day with nobody punched in and nothing explaining why,
| which reads as broken rather than as expected. The difference is that a
| holiday is declared and named, while a weekly off is simply the working
| week, so there is no record to hand it and the day is named instead.
|
| Renders nothing when the date is not a weekly off, so a page can drop it in
| unconditionally rather than wrapping it in a check of its own. A day that is
| also a declared holiday is the caller's to suppress: the holiday is the
| better explanation, and both banners at once says the same thing twice.
|--------------------------------------------------------------------------
*/

function WeeklyOffNotice({
  date,
  label = "Today",
}) {

  if (!date || !isWeeklyOff(date)) return null;

  return (

    <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-4">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <FiCoffee />
      </div>

      <div className="min-w-0">

        <p className="text-sm font-semibold text-indigo-900">
          {label} is {getDayName(date)}, enjoy your day
        </p>

        <p className="mt-0.5 text-xs text-indigo-700">
          {formatHolidayDateWithDay(date)}
          {" · Weekly off, nobody is marked absent for this day"}
        </p>

      </div>

    </div>

  );

}

export default WeeklyOffNotice;
