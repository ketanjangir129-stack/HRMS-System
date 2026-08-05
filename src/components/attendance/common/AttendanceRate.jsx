/*
|--------------------------------------------------------------------------
| Attendance Rate
|--------------------------------------------------------------------------
| Progress bar with its percentage, shared by the monthly and department
| reports so the colour thresholds stay in one place.
|--------------------------------------------------------------------------
*/

const getRateColor = (rate) => {

  if (rate >= 90) return "bg-emerald-500";

  if (rate >= 75) return "bg-amber-500";

  return "bg-red-500";

};

function AttendanceRate({ value = 0 }) {
  return (
    <div className="flex items-center gap-3">

      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getRateColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="text-sm font-semibold text-slate-700">
        {value}%
      </span>

    </div>
  );
}

export default AttendanceRate;
