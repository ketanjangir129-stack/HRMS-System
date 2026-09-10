/*
|--------------------------------------------------------------------------
| Import Stat Cards
|--------------------------------------------------------------------------
| The counting tiles the matching, validation, preview and result screens all
| open with. One component, so a total on the preview and the same total on the
| result cannot be drawn two different ways.
|
| Every tile carries an icon and a caption as well as a colour, because a row
| count that is only "the red one" says nothing to somebody who cannot tell it
| from the amber one beside it.
|--------------------------------------------------------------------------
*/

const TONES = {
  slate: "bg-surface-raised text-ink-muted",
  brand: "bg-brand-ring text-brand",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  blue: "bg-blue-50 text-blue-600",
};

export function ImportStatCard({ icon, tone = "slate", label, value, caption }) {

  return (
    <div className="ui-card flex items-center gap-4 px-5 py-4">

      <div
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${TONES[tone] || TONES.slate}`}
      >
        {icon}
      </div>

      <div className="min-w-0">

        <p className="ui-eyebrow">
          {label}
        </p>

        <p className="text-2xl font-bold text-ink">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>

        {caption && (
          <p className="truncate text-xs text-ink-subtle" title={caption}>
            {caption}
          </p>
        )}

      </div>

    </div>
  );

}

export function ImportStatGrid({ children, columns = 4 }) {

  const gridClass =
    columns === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {children}
    </div>
  );

}

export default ImportStatCard;
