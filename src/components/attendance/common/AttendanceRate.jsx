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

/*
| The bar is a fixed 96px in a table cell, where it is one column among many.
| A phone card has the whole width to itself, so callers there pass
| `flex-1` and the bar runs edge to edge with the figure closing the line.
| The default is the table's width, so every existing caller is unchanged.
*/

function AttendanceRate({ value = 0, barClassName = "w-24" }) {
  return (
    <div className="flex items-center gap-3">

      <div
        className={`h-2 overflow-hidden rounded-full bg-surface-muted ${barClassName}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${getRateColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="text-sm font-semibold text-ink-muted">
        {value}%
      </span>

    </div>
  );
}

export default AttendanceRate;
