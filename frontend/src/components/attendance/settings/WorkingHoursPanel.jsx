import { useState } from "react";
import {
  FiAlertCircle,
  FiClock,
  FiInfo,
  FiLoader,
  FiSave,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Skeleton from "../../skeletons/Skeleton";
import useAttendanceSettingsEditor from "../../../hooks/useAttendanceSettingsEditor";
import {
  MAX_GRACE_MINUTES,
  formatTimeValue,
  getLateCutoffMinutes,
  getWorkDayMinutes,
  validateWorkRules,
} from "../../../utils/attendance/attendanceSettings";
import { formatWorkingMinutes } from "../../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Working Hours
|--------------------------------------------------------------------------
| The company's working day: when it starts, when it ends, and how long after
| the start somebody can still arrive without being marked Late.
|
| Nothing here checks who is asking. `/attendance/settings` is mounted behind
| `PermissionRoute permission="attendance.settings"`, which is the switch the
| owner sets on the Roles & Access screen, so a second check in this component
| would be another lock on the same door - and one that could quietly disagree
| with it.
|
| The panel configures the rule. It does not apply it: whether a punch was Late
| is decided by the attendance service at the moment the punch is recorded and
| stored on the record, which is why changing the times here never rewrites a
| day that has already been marked.
|
| Closed, it is a card in the settings grid like any other, with the schedule it
| holds written on its badge. Opened, the same card grows across the row and
| becomes the form. It is one card in two states rather than a card that leads
| somewhere: the working day is three fields, and sending somebody to another
| screen to type three fields is a page they then have to come back from.
|--------------------------------------------------------------------------
*/

function FieldError({ message }) {

  if (!message) return null;

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
      <FiAlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  );

}

/*
| The schedule read back as a sentence, so the three boxes can be checked
| without working out what they add up to. It follows the draft rather than
| what is stored - the point of it is to answer "what am I about to save".
|
| Only drawn once the draft is a schedule at all: a half typed time has no cut
| off to state, and the field errors are already saying so.
*/

function SchedulePreview({ draft, valid }) {

  if (!valid) return null;

  const cutoffMinutes = getLateCutoffMinutes(draft);

  const cutoff = `${String(Math.floor(cutoffMinutes / 60)).padStart(2, "0")}:${String(
    cutoffMinutes % 60
  ).padStart(2, "0")}`;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">

      <FiInfo className="mt-0.5 shrink-0 text-blue-600" size={16} />

      <p className="text-xs text-blue-800 sm:text-sm">
        Employees punching in after{" "}
        <span className="font-semibold">{formatTimeValue(cutoff)}</span>{" "}
        are marked Late. A full working day is{" "}
        <span className="font-semibold">
          {formatWorkingMinutes(getWorkDayMinutes(draft))}
        </span>
        .
      </p>

    </div>
  );

}

function WorkingHoursPanel() {

  /*
  | Closed to begin with. The working day is configured once and then left
  | alone, so the screen opens on the section rather than on the form, and the
  | page keeps room for the sections that come after it.
  */
  const [open, setOpen] = useState(false);

  const {
    saved,
    draft,
    errors,
    dirty,
    loading,
    error,
    saving,
    setField,
    cancel,
    save,
  } = useAttendanceSettingsEditor();

  const handleSave = async () => {

    const result = await save();

    // An empty message is the duplicate submission guard answering
    if (!result?.message) return;

    if (result.success) {
      toast.success(result.message);
      return;
    }

    toast.error(result.message);

  };

  /*
  | Read off the draft rather than off `errors`, which is only filled in on a
  | failed save: a field's error is cleared the moment it is edited, so a
  | schedule that has just been typed into an invalid state would still have an
  | empty error map and the preview would state a cut off that cannot be saved.
  */
  const previewable =
    Object.keys(validateWorkRules(draft)).length === 0;

  /*
  |--------------------------------------------------------------------------
  | Closed
  |--------------------------------------------------------------------------
  | The same card the rest of the settings grid is made of - tile, title,
  | description, badge - with the schedule it is holding on the badge instead
  | of a status word, so the working day can be read without opening anything.
  |
  | The whole card is the control rather than a button inside it: a card that
  | does one thing should be pressable everywhere it is visible.
  |
  | The times come off `saved` rather than `draft`, so the badge always states
  | what is stored. A draft that was typed and abandoned is not the company's
  | working day.
  */

  if (!open) {

    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="ui-card ui-card-interactive ui-card-body w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >

        <div className="ui-tile bg-blue-50 text-xl text-blue-600">
          <FiClock />
        </div>

        <h2 className="ui-card-title mt-4">
          Working Hours
        </h2>

        <p className="ui-card-subtitle">
          Work start, end and grace period
        </p>

        {loading ? (
          <Skeleton className="mt-4 h-5 w-40 rounded-full" />
        ) : (
          <span className="ui-badge mt-4 bg-blue-50 text-blue-700">
            {formatTimeValue(saved.startTime)} &ndash;{" "}
            {formatTimeValue(saved.endTime)}
          </span>
        )}

      </button>
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Open
  |--------------------------------------------------------------------------
  | The same card across the whole row, because three fields side by side do
  | not fit in the third of a row the closed card occupies.
  |
  | The spans are written out rather than assembled: Tailwind builds its
  | stylesheet by scanning the source for whole class names, and a class put
  | together at runtime is never in the output.
  */

  return (
    <div className="ui-card overflow-hidden md:col-span-2 xl:col-span-3">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line p-4 sm:gap-4 sm:px-6 sm:py-5">

        <div className="ui-tile ui-tile-sm bg-blue-50 text-lg text-blue-600">
          <FiClock />
        </div>

        <div className="min-w-0 flex-1">

          <h2 className="ui-card-title">
            Working Hours
          </h2>

          <p className="ui-card-subtitle">
            The working day every punch in is measured against
          </p>

        </div>

        {/*
        | Closing puts the stored schedule back first. A half typed time left
        | behind a closed card would reopen looking like the company's working
        | day, and Save would be waiting on it.
        */}
        <button
          type="button"
          onClick={() => {
            cancel();
            setOpen(false);
          }}
          disabled={saving}
          aria-label="Close working hours"
          className="ui-icon-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiX size={20} />
        </button>

      </div>

      <div className="space-y-4 p-4 sm:p-6">

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">

            <FiAlertCircle className="mt-0.5 shrink-0 text-red-600" size={16} />

            <p className="text-xs text-red-700 sm:text-sm">
              {error}
            </p>

          </div>
        )}

        {loading ? (

          <div className="space-y-4">

            <Skeleton className="h-[60px] w-full" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-[70px] w-full" />
              <Skeleton className="h-[70px] w-full" />
              <Skeleton className="h-[70px] w-full" />
            </div>

          </div>

        ) : (

          <>

            <SchedulePreview draft={draft} valid={previewable} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">

              <div>

                <label htmlFor="work-start-time" className="ui-eyebrow mb-1.5 block">
                  Work Start Time <span className="text-red-500">*</span>
                </label>

                <input
                  id="work-start-time"
                  type="time"
                  value={draft.startTime}
                  onChange={(event) =>
                    setField("startTime", event.target.value)
                  }
                  disabled={saving}
                  className="ui-field"
                />

                {errors.startTime ? (
                  <FieldError message={errors.startTime} />
                ) : (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    When the working day begins.
                  </p>
                )}

              </div>

              <div>

                <label htmlFor="work-end-time" className="ui-eyebrow mb-1.5 block">
                  Work End Time <span className="text-red-500">*</span>
                </label>

                <input
                  id="work-end-time"
                  type="time"
                  value={draft.endTime}
                  onChange={(event) =>
                    setField("endTime", event.target.value)
                  }
                  disabled={saving}
                  className="ui-field"
                />

                {errors.endTime ? (
                  <FieldError message={errors.endTime} />
                ) : (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Must be later on the same day.
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="work-grace-period"
                  className="ui-eyebrow mb-1.5 block"
                >
                  Grace Period (minutes) <span className="text-red-500">*</span>
                </label>

                {/*
                | `type="text"` with a numeric mode rather than `type="number"`:
                | a number input swallows a stray scroll as an edit and silently
                | drops a value it cannot parse, so a mistyped grace period
                | would vanish instead of being reported.
                */}
                <input
                  id="work-grace-period"
                  type="text"
                  inputMode="numeric"
                  value={draft.gracePeriodMinutes}
                  onChange={(event) =>
                    setField(
                      "gracePeriodMinutes",
                      event.target.value.replace(/[^\d]/g, "")
                    )
                  }
                  placeholder="e.g. 15"
                  disabled={saving}
                  className="ui-field"
                />

                {errors.gracePeriodMinutes ? (
                  <FieldError message={errors.gracePeriodMinutes} />
                ) : (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Employees arriving after the grace period are marked Late.
                    Up to {MAX_GRACE_MINUTES} minutes.
                  </p>
                )}

              </div>

            </div>

          </>

        )}

      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">

        <p className="text-xs text-ink-subtle sm:text-sm">
          {dirty
            ? "You have unsaved changes."
            : "Applies to this company only."}
        </p>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3">

          <button
            type="button"
            onClick={cancel}
            disabled={!dirty || saving}
            className="ui-btn ui-btn-secondary font-semibold"
          >
            <FiX size={16} className="shrink-0" />
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || loading}
            className="ui-btn ui-btn-primary font-semibold"
          >

            {saving ? (
              <>
                <FiLoader size={16} className="shrink-0 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiSave size={16} className="shrink-0" />
                Save Changes
              </>
            )}

          </button>

        </div>

      </div>

    </div>
  );

}

export default WorkingHoursPanel;
