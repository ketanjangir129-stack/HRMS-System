import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiCalendar,
  FiLoader,
  FiPlus,
  FiX,
} from "react-icons/fi";
import {
  HOLIDAY_DATE_MODE,
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_MULTIPLE_DATES_MAX,
  HOLIDAY_NAME_MAX,
  HOLIDAY_TYPE,
  HOLIDAY_TYPES,
} from "../../utils/holiday/holidayConstants";
import {
  findHolidayConflict,
  findHolidayDatesConflict,
  findHolidayRangeConflict,
  formatHolidayDateWithDay,
  getDayName,
  isWeekend,
  validateHolidayForm,
} from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holiday Modal
|--------------------------------------------------------------------------
| One modal for adding and editing a holiday. The only difference between the
| two is the record it starts from, so a single form keeps the validation,
| the layout and the wording in one place.
|
| Errors are shown inline per field rather than as a toast, because a form
| with five fields has to say which one is wrong.
|
| A clash with a holiday already on screen is caught here before a save is
| attempted. The service checks again against the stored year: this is the
| instant feedback, that is the guarantee.
|--------------------------------------------------------------------------
*/

/*
| Not `.ui-field`: the kit rests on the card surface, and this form's inputs
| are recessed onto the muted one and lift to the surface on focus - which is
| how every other modal in the app writes its fields.
*/
const inputClass =
  "w-full rounded-xl border bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:bg-surface focus:ring-2";

const fieldClass = (hasError) =>
  `${inputClass} ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-line focus:border-brand focus:ring-brand-ring"
  }`;

const DATE_MODES = [
  {
    value: HOLIDAY_DATE_MODE.SINGLE,
    label: "Single day",
    hint: "One holiday on one date.",
  },
  {
    value: HOLIDAY_DATE_MODE.RANGE,
    label: "Date range",
    hint: "Consecutive days, e.g. a Diwali or Eid break.",
  },
  {
    value: HOLIDAY_DATE_MODE.MULTIPLE,
    label: "Multiple dates",
    hint: "Separate dates under one name, e.g. every second Saturday.",
  },
];

function FieldError({ message }) {

  if (!message) return null;

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <FiAlertCircle size={12} />
      {message}
    </p>
  );

}

function HolidayForm({
  onClose,
  onSubmit,
  holiday = null,
  holidays = [],
  year,
  submitting = false,
}) {

  const isEdit = Boolean(holiday?.holidayId);

  const [form, setForm] = useState(() => ({
    name: holiday?.name || "",
    date: holiday?.date || "",
    endDate: holiday?.date || "",
    dateMode: HOLIDAY_DATE_MODE.SINGLE,
    dates: [],
    type: holiday?.type || HOLIDAY_TYPE.NATIONAL,
    description: holiday?.description || "",
    isOptional: Boolean(holiday?.isOptional),
  }));

  const [errors, setErrors] = useState({});

  // The date being picked before it is added to the list in "multiple" mode.
  const [pendingDate, setPendingDate] = useState("");

  const isRange = form.dateMode === HOLIDAY_DATE_MODE.RANGE;
  const isMultiple = form.dateMode === HOLIDAY_DATE_MODE.MULTIPLE;

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);

  }, [submitting, onClose]);

  /*
  | Editing a field clears its own error, so a message never outlives the
  | problem it described.
  */

  const setField = (field, value) => {

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {

      if (!current[field]) return current;

      const next = { ...current };

      delete next[field];

      return next;

    });

  };

  const multiDayCount =
    isRange && form.date && form.endDate && form.endDate >= form.date
      ? Math.round(
          (new Date(`${form.endDate}T00:00:00Z`).getTime() -
            new Date(`${form.date}T00:00:00Z`).getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1
      : 1;

  /*
  | A live conflict warning while typing, so a duplicate is visible before the
  | save button is ever pressed.
  */

  const conflict = isMultiple
    ? findHolidayDatesConflict(holidays, form.dates)
    : form.date
      ? findHolidayConflict(holidays, {
          date: form.date,
          ignoreId: holiday?.holidayId || "",
        })
      : null;

  const addPendingDate = () => {

    if (!pendingDate) return;

    if (form.dates.includes(pendingDate)) {
      toast.info("That date is already in the list.");
      return;
    }

    if (form.dates.length >= HOLIDAY_MULTIPLE_DATES_MAX) {
      toast.error(`At most ${HOLIDAY_MULTIPLE_DATES_MAX} dates can be added at once.`);
      return;
    }

    setField("dates", [...form.dates, pendingDate].sort());
    setErrors((current) => {
      const next = { ...current };
      delete next.date;
      return next;
    });
    setPendingDate("");

  };

  const removeDate = (value) =>
    setField("dates", form.dates.filter((item) => item !== value));

  const handleSubmit = async () => {

    const validation = validateHolidayForm({
      ...form,
      isMultiDay: isRange,
      ...(isMultiple ? { dates: form.dates } : { dates: undefined }),
    });

    if (Object.keys(validation).length > 0) {

      setErrors(validation);

      toast.error("Please fix the highlighted fields.");

      return;

    }

    /*
    | Several separate dates, all under one name
    */
    if (isMultiple) {

      const clash = findHolidayDatesConflict(holidays, form.dates);

      if (clash) {
        toast.error(`Conflict: ${clash.name} is already recorded on ${clash.date}.`);
        return;
      }

      await onSubmit({
        name: form.name.trim(),
        date: form.dates[0],
        dates: form.dates,
        type: form.type,
        description: form.description.trim(),
        isOptional: form.isOptional,
      });

      return;

    }

    /*
    | Multi-day range conflict check
    */
    if (isRange && form.endDate && form.endDate !== form.date) {

      const clash = findHolidayRangeConflict(holidays, {
        startDate: form.date,
        endDate: form.endDate,
        ignoreId: holiday?.holidayId || "",
      });

      if (clash) {

        toast.error(
          `Conflict: ${clash.name} is already recorded on ${clash.date}.`
        );

        return;

      }

      await onSubmit({
        name: form.name.trim(),
        date: form.date,
        endDate: form.endDate,
        isMultiDay: true,
        type: form.type,
        description: form.description.trim(),
        isOptional: form.isOptional,
      });

      return;

    }

    /*
    | Single day conflict check
    */
    const clash = findHolidayConflict(holidays, {
      date: form.date,
      ignoreId: holiday?.holidayId || "",
    });

    if (clash) {

      toast.error(`${clash.name} is already recorded on this date.`);

      return;

    }

    await onSubmit({
      name: form.name.trim(),
      date: form.date,
      type: form.type,
      description: form.description.trim(),
      isOptional: form.isOptional,
    });

  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">

      {/*
      | Taller on a phone, where the browser chrome already takes a slice of
      | the viewport and a 90vh sheet leaves the footer buttons floating.
      */}
      <div className="hide-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface shadow-2xl sm:max-h-[90vh]">

        {/* Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
              <FiCalendar size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="ui-card-title">
                {isEdit ? "Edit Holiday" : "Add Holiday"}
              </h2>

              <p className="ui-card-subtitle truncate">
                {isEdit
                  ? "Update the holiday details."
                  : `Declare a holiday on the ${year} calendar.`}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}

        <div className="space-y-5 p-4 sm:space-y-7 sm:p-8">

          {/* Name */}

          <div>

            <label
              htmlFor="holiday-name"
              className="ui-eyebrow mb-1.5 block"
            >
              Holiday Name <span className="text-red-500">*</span>
            </label>

            <input
              id="holiday-name"
              type="text"
              value={form.name}
              maxLength={HOLIDAY_NAME_MAX}
              onChange={(event) =>
                setField("name", event.target.value)
              }
              placeholder="e.g. Independence Day"
              className={fieldClass(errors.name)}
            />

            <FieldError message={errors.name} />

          </div>

          {/*
          | How the dates are given. Only when creating: an edit is always one
          | record on one date.
          */}
          {!isEdit && (
            <div>
              <span className="ui-eyebrow mb-1.5 block">Dates</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-muted p-1">
                {DATE_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setField("dateMode", mode.value);
                      if (
                        mode.value === HOLIDAY_DATE_MODE.RANGE &&
                        (!form.endDate || form.endDate < form.date)
                      ) {
                        setField("endDate", form.date || "");
                      }
                      if (
                        mode.value === HOLIDAY_DATE_MODE.MULTIPLE &&
                        form.dates.length === 0 &&
                        form.date
                      ) {
                        setField("dates", [form.date]);
                      }
                    }}
                    className={`cursor-pointer rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm ${
                      form.dateMode === mode.value
                        ? "bg-surface text-blue-700 shadow-sm ring-1 ring-blue-200"
                        : "text-ink-subtle hover:text-ink"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                {DATE_MODES.find((mode) => mode.value === form.dateMode)?.hint}
              </p>
            </div>
          )}

          {/* Date Selection: Multiple, Range or Single */}
          {isMultiple ? (
            <div>
              <label
                htmlFor="holiday-multi-date"
                className="ui-eyebrow mb-1.5 block"
              >
                Holiday Dates <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2">
                <input
                  id="holiday-multi-date"
                  type="date"
                  value={pendingDate}
                  onChange={(event) => setPendingDate(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addPendingDate();
                    }
                  }}
                  className={`${fieldClass(errors.date)} cursor-pointer`}
                />
                <button
                  type="button"
                  onClick={addPendingDate}
                  disabled={!pendingDate}
                  className="ui-btn ui-btn-secondary shrink-0 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlus /> Add
                </button>
              </div>

              <FieldError message={errors.date} />

              {form.dates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.dates.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
                    >
                      {formatHolidayDateWithDay(item)}
                      <button
                        type="button"
                        onClick={() => removeDate(item)}
                        aria-label={`Remove ${item}`}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full hover:bg-blue-100"
                      >
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {form.dates.length > 0 && (
                <p className="mt-2 text-xs text-ink-faint">
                  {form.dates.length} {form.dates.length === 1 ? "date" : "dates"} selected. Each one is saved as its own holiday under this name.
                </p>
              )}
            </div>
          ) : isRange ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="holiday-start-date"
                    className="ui-eyebrow mb-1.5 block"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="holiday-start-date"
                    type="date"
                    value={form.date}
                    onChange={(event) => {
                      const newStart = event.target.value;
                      setField("date", newStart);
                      if (form.endDate && form.endDate < newStart) {
                        setField("endDate", newStart);
                      }
                    }}
                    className={`${fieldClass(errors.date)} cursor-pointer`}
                  />
                  <FieldError message={errors.date} />
                </div>

                <div>
                  <label
                    htmlFor="holiday-end-date"
                    className="ui-eyebrow mb-1.5 block"
                  >
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="holiday-end-date"
                    type="date"
                    value={form.endDate}
                    min={form.date || undefined}
                    onChange={(event) =>
                      setField("endDate", event.target.value)
                    }
                    className={`${fieldClass(errors.endDate)} cursor-pointer`}
                  />
                  <FieldError message={errors.endDate} />
                </div>
              </div>

              {form.date && form.endDate && form.endDate >= form.date && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800">
                  <span className="font-semibold">
                    {multiDayCount} {multiDayCount === 1 ? "day" : "consecutive days"}
                  </span>{" "}
                  selected ({form.date} to {form.endDate}). Each day will be registered with individual dates for proper attendance & leave tracking.
                </div>
              )}
            </div>
          ) : (
            <div>
              <label
                htmlFor="holiday-date"
                className="ui-eyebrow mb-1.5 block"
              >
                Holiday Date <span className="text-red-500">*</span>
              </label>

              <input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setField("date", event.target.value)
                }
                className={`${fieldClass(errors.date)} cursor-pointer`}
              />

              <FieldError message={errors.date} />

              {!errors.date && form.date && (
                <p className="mt-1.5 text-xs text-ink-faint">
                  {formatHolidayDateWithDay(form.date)}
                  {isWeekend(form.date) &&
                    ` · ${getDayName(form.date)} is a weekend`}
                </p>
              )}
            </div>
          )}

          {/* Type */}

          <div>

            <label className="ui-eyebrow mb-3 block">
              Holiday Type <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {HOLIDAY_TYPES.map((item) => (

                <button
                  key={item.value}
                  type="button"
                  onClick={() => setField("type", item.value)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                    form.type === item.value
                      ? "border-brand bg-blue-50 ring-2 ring-brand-ring"
                      : "border-line hover:border-blue-300 hover:bg-surface-muted"
                  }`}
                >

                  <span
                    className={`block text-sm font-semibold ${
                      form.type === item.value
                        ? "text-blue-700"
                        : "text-ink-muted"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-0.5 block text-xs text-ink-subtle">
                    {item.description}
                  </span>

                </button>

              ))}

            </div>

            <FieldError message={errors.type} />

          </div>

          {/* Optional */}

          <button
            type="button"
            onClick={() =>
              setField("isOptional", !form.isOptional)
            }
            className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition-all ${
              form.isOptional
                ? "border-emerald-500 bg-emerald-50"
                : "border-line bg-surface-muted hover:border-slate-300"
            }`}
          >

            <span className="min-w-0">

              <span className="block text-sm font-semibold text-ink-muted">
                Optional Holiday
              </span>

              <span className="mt-0.5 block text-xs text-ink-subtle">
                Employees may choose to work this day instead of taking it off.
              </span>

            </span>

            {/* A switch rather than a checkbox, to match the card controls above. */}
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                /*
                | The off track is `ink-faint` rather than a surface token: a
                | white knob has to stay visible on it, and every surface in
                | the light theme is near enough to white to swallow it.
                */
                form.isOptional ? "bg-emerald-500" : "bg-ink-faint"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isOptional ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>

          </button>

          {/* Description */}

          <div>

            <label
              htmlFor="holiday-description"
              className="ui-eyebrow mb-1.5 block"
            >
              Description
            </label>

            <textarea
              id="holiday-description"
              rows={4}
              value={form.description}
              maxLength={HOLIDAY_DESCRIPTION_MAX}
              onChange={(event) =>
                setField("description", event.target.value)
              }
              placeholder="Add a short note about this holiday..."
              className={`${fieldClass(errors.description)} resize-none`}
            />

            <FieldError message={errors.description} />

            {!errors.description && (
              <p className="mt-1.5 text-xs text-ink-faint">
                Optional · {form.description.trim().length} /{" "}
                {HOLIDAY_DESCRIPTION_MAX} characters
              </p>
            )}

          </div>

          {/* Conflict */}

          {conflict && (

            <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">

              <FiAlertCircle className="mt-0.5 shrink-0" />

              {`${conflict.name} is already recorded on ${formatHolidayDateWithDay(conflict.date)}.`}

            </p>

          )}

        </div>

        {/* Footer */}

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-line bg-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="ui-btn ui-btn-primary w-full font-semibold sm:w-auto"
          >

            {submitting && <FiLoader className="animate-spin" />}

            {submitting
              ? isEdit
                ? "Saving..."
                : "Adding..."
              : isEdit
                ? "Save Changes"
                : "Add Holiday"}

          </button>

        </div>

      </div>

    </div>

  );

}

/*
| The form only exists while the modal is open, so every holiday starts from
| a clean slate instead of the fields the previous one was left with. It is
| also what resets the form after a successful save, because the parent
| closes the modal and the state goes with it.
|
| The holiday id is part of the key, so switching straight from editing one
| holiday to another remounts the form with the new record's values.
*/

function HolidayModal({ open, holiday, ...props }) {

  if (!open) return null;

  return (
    <HolidayForm
      key={holiday?.holidayId || "new"}
      holiday={holiday}
      {...props}
    />
  );

}

export default HolidayModal;
