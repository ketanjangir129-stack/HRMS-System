import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiCalendar,
  FiLoader,
  FiX,
} from "react-icons/fi";
import {
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_NAME_MAX,
  HOLIDAY_TYPE,
  HOLIDAY_TYPES,
} from "../../utils/holiday/holidayConstants";
import {
  findHolidayConflict,
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

const inputClass =
  "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2";

const fieldClass = (hasError) =>
  `${inputClass} ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

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
    type: holiday?.type || HOLIDAY_TYPE.NATIONAL,
    description: holiday?.description || "",
    isOptional: Boolean(holiday?.isOptional),
  }));

  const [errors, setErrors] = useState({});

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

  /*
  | A live conflict warning while typing, so a duplicate is visible before the
  | save button is ever pressed.
  */

  const conflict =
    form.date || form.name
      ? findHolidayConflict(holidays, {
          date: form.date,
          name: form.name,
          ignoreId: holiday?.holidayId || "",
        })
      : null;

  const handleSubmit = async () => {

    const validation = validateHolidayForm(form);

    if (Object.keys(validation).length > 0) {

      setErrors(validation);

      toast.error("Please fix the highlighted fields.");

      return;

    }

    /*
    | The clash is re-derived from the current values rather than read from
    | the render above, so a field changed in the same tick cannot slip past.
    */

    const clash = findHolidayConflict(holidays, {
      date: form.date,
      name: form.name,
      ignoreId: holiday?.holidayId || "",
    });

    if (clash) {

      toast.error(
        clash.date === form.date
          ? `${clash.name} is already recorded on this date.`
          : `A holiday named "${clash.name}" already exists.`
      );

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
      <div className="hide-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]">

        {/* Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
              <FiCalendar size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {isEdit ? "Edit Holiday" : "Add Holiday"}
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
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
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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

          {/* Date */}

          <div>

            <label
              htmlFor="holiday-date"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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

            {/*
            | The day of the week the chosen date falls on, because a holiday
            | that lands on a weekly off costs the company nothing and is
            | worth noticing before it is saved.
            */}
            {!errors.date && form.date && (

              <p className="mt-1.5 text-xs text-slate-400">
                {formatHolidayDateWithDay(form.date)}
                {isWeekend(form.date) &&
                  ` · ${getDayName(form.date)} is a weekend`}
              </p>

            )}

          </div>

          {/* Type */}

          <div>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Holiday Type <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              {HOLIDAY_TYPES.map((item) => (

                <button
                  key={item.value}
                  type="button"
                  onClick={() => setField("type", item.value)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                    form.type === item.value
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >

                  <span
                    className={`block text-sm font-semibold ${
                      form.type === item.value
                        ? "text-blue-700"
                        : "text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-500">
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
                : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}
          >

            <span className="min-w-0">

              <span className="block text-sm font-semibold text-slate-800">
                Optional Holiday
              </span>

              <span className="mt-0.5 block text-xs text-slate-500">
                Employees may choose to work this day instead of taking it off.
              </span>

            </span>

            {/* A switch rather than a checkbox, to match the card controls above. */}
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.isOptional ? "bg-emerald-500" : "bg-slate-300"
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
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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
              <p className="mt-1.5 text-xs text-slate-400">
                Optional · {form.description.trim().length} /{" "}
                {HOLIDAY_DESCRIPTION_MAX} characters
              </p>
            )}

          </div>

          {/* Conflict */}

          {conflict && (

            <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">

              <FiAlertCircle className="mt-0.5 shrink-0" />

              {conflict.date === form.date
                ? `${conflict.name} is already recorded on ${formatHolidayDateWithDay(conflict.date)}.`
                : `A holiday named "${conflict.name}" already exists on ${formatHolidayDateWithDay(conflict.date)}.`}

            </p>

          )}

        </div>

        {/* Footer */}

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
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
