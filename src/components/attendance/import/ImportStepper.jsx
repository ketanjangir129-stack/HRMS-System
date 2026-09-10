import { FiCheck } from "react-icons/fi";

import { IMPORT_STEPS } from "../../../utils/attendance/attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Import Stepper
|--------------------------------------------------------------------------
| Where the import has got to, and how much of it is left.
|
| An import is the one place in this module where somebody is asked to answer
| four questions before anything happens, and a wizard that does not say how
| many are left is a wizard people abandon on the second screen.
|
| It is a list of states rather than a set of links: a step cannot be jumped
| to, because each one needs what the one before it produced. The page's own
| Back buttons are what move backwards, and they undo the step they leave.
|
| `aria-current` marks the active step and the completed ones say so in their
| label rather than only by turning indigo, so the progress is not carried by
| colour alone.
|--------------------------------------------------------------------------
*/

function ImportStepper({ currentStep }) {

  const index = IMPORT_STEPS.findIndex((step) => step.key === currentStep);

  /*
  | A step the wizard has moved past but that is not on the list - the progress
  | screen sits between Preview and Import - counts as being on the last one,
  | so the indicator does not empty out mid run.
  */
  const activeIndex = index === -1 ? IMPORT_STEPS.length - 1 : index;

  return (
    <ol
      className="ui-scroll flex items-center gap-1.5 overflow-x-auto sm:gap-2"
      aria-label="Import progress"
    >

      {IMPORT_STEPS.map((step, stepIndex) => {

        const isCurrent = stepIndex === activeIndex;

        const isDone = stepIndex < activeIndex;

        return (
          <li key={step.key} className="flex shrink-0 items-center gap-1.5 sm:gap-2">

            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3 ${
                isCurrent
                  ? "bg-brand text-white"
                  : isDone
                    ? "bg-brand-ring text-brand"
                    : "bg-surface-muted text-ink-faint"
              }`}
            >

              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isCurrent
                    ? "bg-white/25"
                    : isDone
                      ? "bg-brand text-white"
                      : "bg-surface-raised text-ink-subtle"
                }`}
              >
                {isDone ? <FiCheck size={10} /> : stepIndex + 1}
              </span>

              {step.label}

              {isDone && <span className="sr-only">, completed</span>}

            </span>

            {stepIndex < IMPORT_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-px w-3 sm:w-5 ${isDone ? "bg-brand/40" : "bg-line"}`}
              />
            )}

          </li>
        );

      })}

    </ol>
  );

}

export default ImportStepper;
