import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiPauseCircle,
} from "react-icons/fi";

/*
| The cards count employees on the company wide views and days on an
| employee's own month, so the captions are overridable. Leaving them out
| keeps the wording every existing screen already shows.
*/

const DEFAULT_SUBTITLES = {
  present: "Employees Present",
  absent: "Employees Absent",
  late: "Late Arrivals",
  leave: "Employees On Leave",
  pending: "Awaiting Approval",
};

/*
| Two across on a phone rather than one. Stacked, the four cards are a screen
| and a half of scrolling before the page below them starts, and the number on
| each is short enough to read at half the width.
|
| `showPending` adds a fifth card for the days nobody has signed off yet. It
| is opt in because it needs a grid with room for it, and because it only
| answers a question the screens that can act on it are asking: on those, a
| Present count that looks low is explained by the card next to it instead of
| looking like half the company stayed home.
*/

function AttendanceSummaryCards({
  summary,
  gridClassName = "grid-cols-2 xl:grid-cols-4",
  compact = false,
  subtitles,
  showPending = false,
}) {

  const caption = { ...DEFAULT_SUBTITLES, ...subtitles };

  const cards = [
    {
      title: "Present",
      value: summary.present,
      percentage: summary.presentPercentage,
      subtitle: caption.present,
      icon: <FiCheckCircle />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    {
      title: "Absent",
      value: summary.absent,
      percentage: summary.absentPercentage,
      subtitle: caption.absent,
      icon: <FiXCircle />,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      bar: "bg-red-500",
    },
    {
      title: "Late",
      value: summary.late,
      percentage: summary.latePercentage,
      subtitle: caption.late,
      icon: <FiClock />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
    },
    {
      title: "On Leave",
      value: summary.leave,
      percentage: summary.leavePercentage,
      subtitle: caption.leave,
      icon: <FiCalendar />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      bar: "bg-blue-500",
    },
    ...(showPending
      ? [
        {
          title: "Pending",
          value: summary.pending || 0,
          percentage: summary.pendingPercentage || 0,
          subtitle: caption.pending,
          icon: <FiPauseCircle />,
          iconBg: "bg-surface-muted",
          iconColor: "text-ink-muted",
          bar: "bg-ink-faint",
          /*
          | Fifth of five in a two column grid, so it would otherwise sit on a
          | row of its own with an empty half beside it. Run full width until
          | the grid is wide enough to hold all five across.
          */
          spanClassName: "col-span-2 xl:col-span-1",
        },
      ]
      : []),
  ];

  /*
  | No `h-full` on the grid.
  |
  | These sat in a row beside the punch card, which is several times taller
  | than a stat card and is what decides the height of that row. Asking the
  | grid to fill the height handed each card two hundred and fifty pixels to
  | put four short lines in, and no amount of centring rescues a card that is
  | twice the height of its contents - it only moves the hole from the bottom
  | to both ends.
  |
  | Sized to their contents instead, and the caller places the block in
  | whatever room the row has.
  */

  return (
    <div className={`grid gap-3 sm:gap-6 ${gridClassName}`}>

      {cards.map((card) => (

        <div
          key={card.title}
          /*
          | Still a centred column: the rows of the grid equalise, so a card
          | whose caption wraps onto a second line makes its neighbour taller
          | than its own contents. Centring splits that slack evenly rather
          | than pooling it under the bar.
          */
          className={`ui-card ui-card-interactive group relative flex flex-col justify-center overflow-hidden ${
            compact
              ? "min-h-32 p-3 sm:min-h-36.25 sm:p-4"
              : "p-4 sm:p-6"
          } ${card.spanClassName || ""}`}
        >

          {/* Top Border */}

          <span
            className={`absolute left-0 top-0 h-1 w-full ${card.bar}`}
          />

          {/* Header */}

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                {card.title}
              </p>

              <h2
                className={`mt-1 font-bold text-ink sm:mt-2 ${
                  compact
                    ? "text-2xl sm:text-3xl"
                    : "text-3xl sm:text-4xl"
                }`}
              >
                {card.value}
              </h2>

            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg sm:h-12 sm:w-12 sm:text-xl ${card.iconBg} ${card.iconColor} transition group-hover:scale-110`}
            >
              {card.icon}
            </div>

          </div>

          {/* Progress */}

          <div className={compact ? "mt-3" : "mt-4 sm:mt-6"}>

            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-ink-subtle sm:text-xs">

              <span className="truncate">{card.subtitle}</span>

              <span className="shrink-0">{card.percentage}%</span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">

              <div
                className={`h-full rounded-full transition-all duration-500 ${card.bar}`}
                style={{
                  width: `${card.percentage}%`,
                }}
              />

            </div>

          </div>

        </div>

      ))}

    </div>
  );
}

export default AttendanceSummaryCards;
