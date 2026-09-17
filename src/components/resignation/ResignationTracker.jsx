import { Check, X } from "lucide-react";

import {
  RESIGNATION_STAGES,
  getStageIndex,
  isRejectedStatus,
} from "../../utils/resignation/resignationConstants";

/*
|--------------------------------------------------------------------------
| Resignation Tracker
|--------------------------------------------------------------------------
| The seven steps of an exit, with the one it is on marked.
|
| It answers the question an employee actually has - "where has this got to
| and who is holding it" - which a status pill on its own cannot: "HR
| Approval Pending" says nothing about whether the equipment step is still to
| come or already behind them.
|
| A rejected resignation stops where it stopped. The stage that refused it is
| drawn in red and the ones after it stay grey rather than being marked as
| skipped, because they did not happen - an exit that was turned down at the
| manager never had an equipment step to miss.
|
| Two layouts of the same list: a horizontal rail from `md` where there is
| room for seven labels, and a vertical one below that, where seven columns
| would be seven illegible slivers. Both are built from `RESIGNATION_STAGES`,
| so a step added there appears in both without either being edited.
|--------------------------------------------------------------------------
*/

const STATE = {
  DONE: "done",
  CURRENT: "current",
  REJECTED: "rejected",
  UPCOMING: "upcoming",
};

/* The dot's look, per state. Kept as one map so the two layouts below cannot
   end up colouring the same step differently. */
const DOT_STYLES = {
  [STATE.DONE]: "border-emerald-500 bg-emerald-500 text-white",
  [STATE.CURRENT]: "border-brand bg-surface text-brand ring-4 ring-brand-ring",
  [STATE.REJECTED]: "border-red-500 bg-red-500 text-white",
  [STATE.UPCOMING]: "border-line bg-surface text-ink-faint",
};

const LABEL_STYLES = {
  [STATE.DONE]: "text-ink",
  [STATE.CURRENT]: "text-brand",
  [STATE.REJECTED]: "text-red-600",
  [STATE.UPCOMING]: "text-ink-faint",
};

function ResignationTracker({ status, className = "" }) {

  const rejected = isRejectedStatus(status);

  const currentIndex = getStageIndex(status);

  const stateOf = (index) => {

    if (index < currentIndex) return STATE.DONE;

    if (index === currentIndex) {
      return rejected ? STATE.REJECTED : STATE.CURRENT;
    }

    return STATE.UPCOMING;

  };

  /*
  | The connector between two dots. It is filled only where the journey has
  | actually passed, so the rail reads as a progress bar rather than as seven
  | dots on a grey line.
  */
  const isConnectorFilled = (index) => !rejected && index < currentIndex;

  return (
    <div className={className}>

      {/* Horizontal rail — md and up */}
      <ol className="hidden md:flex md:items-start">

        {RESIGNATION_STAGES.map((stage, index) => {

          const state = stateOf(index);

          const isLast = index === RESIGNATION_STAGES.length - 1;

          return (
            <li
              key={stage.status}
              className={`flex min-w-0 flex-col items-center ${isLast ? "" : "flex-1"
                }`}
            >


              <div className="flex w-full items-center">

                {/*
                | A spacer of the same width as the trailing connector, so the
                | dot sits over the centre of its own label instead of drifting
                | left on every step but the last.
                */}
                <span className={`isLast ? hidden : h-0.5 flex-1 transition-colors ${isConnectorFilled(index) ? "bg-emerald-500" : "bg-line"
                  }`} />

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${DOT_STYLES[state]}`}
                >
                  {state === STATE.DONE ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : state === STATE.REJECTED ? (
                    <X className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>

                {!isLast && (
                  <span
                    className={`h-0.5 flex-1 transition-colors ${isConnectorFilled(index) ? "bg-emerald-500" : "bg-line"
                      }`}
                  />
                )}

              </div>

              <p
                className={`mt-2 px-1 text-center text-xs font-semibold ${LABEL_STYLES[state]}`}
              >
                {stage.label}
              </p>



            </li>
          );

        })}

      </ol>

      {/* Vertical rail — below md */}
      <ol className="space-y-0 md:hidden">

        {RESIGNATION_STAGES.map((stage, index) => {

          const state = stateOf(index);

          const isLast = index === RESIGNATION_STAGES.length - 1;

          return (
            <li key={stage.status} className="flex gap-3">

              <div className="flex flex-col items-center">

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${DOT_STYLES[state]}`}
                >
                  {state === STATE.DONE ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : state === STATE.REJECTED ? (
                    <X className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>

                {!isLast && (
                  <span
                    className={`w-0.5 flex-1 ${isConnectorFilled(index) ? "bg-emerald-500" : "bg-line"
                      }`}
                  />
                )}

              </div>

              {/* The bottom padding is what gives the connector something to
                  run down; the last row needs none. */}
              <div className={isLast ? "pb-0" : "pb-6"}>

                <p className={`text-sm font-semibold ${LABEL_STYLES[state]}`}>
                  {stage.label}
                </p>

                <p className="mt-0.5 text-xs text-ink-subtle">
                  {stage.description}
                </p>

              </div>

            </li>
          );

        })}

      </ol>

    </div>
  );

}

export default ResignationTracker;
