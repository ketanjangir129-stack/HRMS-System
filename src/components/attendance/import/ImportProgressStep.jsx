import { FiLoader, FiSlash } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Step Six - Importing
|--------------------------------------------------------------------------
| What is happening, while it happens.
|
| The four counts underneath the bar are reported per batch as each one lands,
| so a run that is partly failing says so while it is still running rather than
| at the end. `Failed` is drawn in red the moment it is anything but zero: an
| import that quietly finishes and then admits to losing a fortnight is worse
| than one that says so at the time.
|
| Stopping is offered, and is honest about what it does. A batch is a single
| atomic write, so the only place a run can be stopped is between two of them:
| everything already written stays written, and the result screen afterwards
| says exactly how far it got.
|
| `aria-live` on the counts, so the progress is announced rather than only
| animated.
|--------------------------------------------------------------------------
*/

function Counter({ label, value, tone = "ink" }) {

  const tones = {
    ink: "text-ink",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <div className="text-center">

      <p className={`text-2xl font-bold ${tones[tone]}`}>
        {value.toLocaleString()}
      </p>

      <p className="ui-eyebrow mt-0.5">
        {label}
      </p>

    </div>
  );

}

function ImportProgressStep({ progress, onCancel }) {

  const total = progress.total || 0;

  const percent =
    total === 0 ? 0 : Math.round((progress.processed / total) * 100);

  const skipped = Math.max(
    progress.processed - progress.imported - progress.failed,
    0
  );

  return (
    <div className="ui-card overflow-hidden">

      <div className="flex flex-col items-center px-5 py-10 text-center sm:px-6 sm:py-14">

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-ring text-brand">
          <FiLoader size={30} className="animate-spin" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
          Importing attendance...
        </h2>

        <p className="mt-2 text-sm text-ink-subtle">
          Batch {Math.min(
            progress.batches.succeeded + progress.batches.failed + 1,
            progress.batches.total || 1
          )}{" "}
          of {progress.batches.total || 1}. Leave this page open until it
          finishes.
        </p>

        {/* The bar */}
        <div className="mt-6 w-full max-w-md">

          <div className="flex items-end justify-between">

            <span className="text-sm font-semibold text-ink">
              {progress.processed.toLocaleString()} / {total.toLocaleString()}
            </span>

            <span className="text-sm font-semibold text-brand">
              {percent}%
            </span>

          </div>

          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Import progress"
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-raised"
          >
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

        </div>

        {/* The counts */}
        <div
          aria-live="polite"
          className="mt-8 grid w-full max-w-md grid-cols-3 gap-4"
        >

          <Counter label="Processed" value={progress.processed} />

          <Counter label="Imported" value={progress.imported} tone="green" />

          <Counter
            label="Failed"
            value={progress.failed}
            tone={progress.failed ? "red" : "ink"}
          />

        </div>

        {skipped > 0 && (
          <p className="mt-4 text-xs text-ink-subtle">
            {skipped.toLocaleString()} rows still being confirmed.
          </p>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ui-btn ui-btn-ghost mt-8 font-semibold"
          >
            <FiSlash />
            Stop after the current batch
          </button>
        )}

      </div>

    </div>
  );

}

export default ImportProgressStep;
