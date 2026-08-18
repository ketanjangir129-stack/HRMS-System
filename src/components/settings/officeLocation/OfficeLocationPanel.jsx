import { useState } from "react";
import {
  FiAlertCircle,
  FiChevronDown,
  FiInfo,
  FiMapPin,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Skeleton from "../../skeletons/Skeleton";
import useOfficeLocationEditor from "../../../hooks/useOfficeLocationEditor";
import {
  MAX_RADIUS_METRES,
  MIN_RADIUS_METRES,
} from "../../../services/settings/officeLocationService";

/*
|--------------------------------------------------------------------------
| Office Location
|--------------------------------------------------------------------------
| The company's office point and the radius around it.
|
| Owner only, but nothing here checks that: `/settings` is mounted behind
| `PermissionRoute ownerOnly` and the page itself refuses anybody who is not
| the owner, so a second check in this component would be a third lock on the
| same door - and one that could quietly disagree with the other two.
|
| The panel stores a point. It does not decide what anything means by it:
| whether a punch counts as inside the office is a later question, asked
| somewhere else.
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

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function FieldError({ message }) {

  if (!message) return null;

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <FiAlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  );

}

function OfficeLocationPanel() {

  const [open, setOpen] = useState(false);

  /*
  | Clear removes a configuration rather than editing one, and it is the only
  | control here that writes without Save standing between the click and the
  | database. Two steps is what keeps a mis-click from wiping the company's
  | point.
  */
  const [confirmingClear, setConfirmingClear] = useState(false);

  const {
    draft,
    errors,
    dirty,
    configured,
    loading,
    error,
    saving,
    setField,
    cancel,
    save,
    clear,
  } = useOfficeLocationEditor();

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

  const handleClear = async () => {

    setConfirmingClear(false);

    const result = await clear();

    if (!result?.message) return;

    if (result.success) {
      toast.success(result.message);
      return;
    }

    toast.error(result.message);

  };

  const handleCancel = () => {

    setConfirmingClear(false);

    cancel();

  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/*
      | Header
      |
      | Also the switch that opens the panel, so the section sits closed on a
      | page that will grow past it.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:gap-4 sm:px-6 sm:py-5 ${
          open ? "border-b border-slate-200" : ""
        }`}
      >

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
          <FiMapPin className="text-lg sm:text-xl" />
        </div>

        <div className="min-w-0 flex-1">

          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Office Location
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {configured
              ? "Office point configured."
              : "Set the company's office point and the radius around it."}
          </p>

        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 sm:h-9 sm:w-9">
          <FiChevronDown
            size={20}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>

      </button>

      {open && (
      <>

      <div className="space-y-4 p-4 sm:p-6">

        {/*
        | What the point is for, and what it is not for. Somebody configuring
        | a radius will reasonably assume it gates punching, and it does not.
        */}
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">

          <FiInfo className="mt-0.5 shrink-0 text-blue-600" size={16} />

          <p className="text-xs text-blue-800 sm:text-sm">
            Recorded so punch locations can be compared against the office.
            It does not stop anyone from punching in or out.
          </p>

        </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-[70px] w-full" />
              <Skeleton className="h-[70px] w-full" />
            </div>

            <Skeleton className="h-[70px] w-full sm:w-1/2" />

          </div>

        ) : (

          <>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <label htmlFor="office-latitude" className={labelClass}>
                  Latitude <span className="text-red-500">*</span>
                </label>

                {/*
                | `type="text"` with a numeric mode rather than
                | `type="number"`: a number input swallows a stray scroll as
                | an edit, and silently drops a value it cannot parse, so a
                | mistyped coordinate would vanish instead of being reported.
                */}
                <input
                  id="office-latitude"
                  type="text"
                  inputMode="decimal"
                  value={draft.latitude}
                  onChange={(event) =>
                    setField("latitude", event.target.value)
                  }
                  placeholder="e.g. 26.912400"
                  disabled={saving}
                  className={fieldClass(errors.latitude)}
                />

                <FieldError message={errors.latitude} />

              </div>

              <div>

                <label htmlFor="office-longitude" className={labelClass}>
                  Longitude <span className="text-red-500">*</span>
                </label>

                <input
                  id="office-longitude"
                  type="text"
                  inputMode="decimal"
                  value={draft.longitude}
                  onChange={(event) =>
                    setField("longitude", event.target.value)
                  }
                  placeholder="e.g. 75.787300"
                  disabled={saving}
                  className={fieldClass(errors.longitude)}
                />

                <FieldError message={errors.longitude} />

              </div>

            </div>

            <div className="sm:max-w-xs">

              <label htmlFor="office-radius" className={labelClass}>
                Radius (metres) <span className="text-red-500">*</span>
              </label>

              <input
                id="office-radius"
                type="text"
                inputMode="numeric"
                value={draft.radius}
                onChange={(event) =>
                  setField("radius", event.target.value)
                }
                placeholder="e.g. 200"
                disabled={saving}
                className={fieldClass(errors.radius)}
              />

              {errors.radius ? (
                <FieldError message={errors.radius} />
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Between {MIN_RADIUS_METRES} and{" "}
                  {MAX_RADIUS_METRES.toLocaleString()} metres.
                </p>
              )}

            </div>

          </>

        )}

      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">

        <p className="text-xs text-slate-500 sm:text-sm">
          {confirmingClear
            ? "Remove the saved office location?"
            : dirty
              ? "You have unsaved changes."
              : configured
                ? "All changes saved."
                : "No office location configured."}
        </p>

        {/*
        | On a phone the actions are a two column grid rather than a wrapped
        | row, with Save taking a full width line of its own. `col-span-2` is
        | a grid property, so it is ignored once the container becomes the
        | inline flex row from `sm` up.
        */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

          {confirmingClear ? (

            <>

              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                disabled={saving}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
              >
                <FiX size={16} className="shrink-0" />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <FiTrash2 size={16} className="shrink-0" />
                Confirm
              </button>

            </>

          ) : (

            <>

              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                disabled={!configured || saving || loading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
              >
                <FiTrash2 size={16} className="shrink-0" />
                Clear
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={!dirty || saving}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
              >
                <FiX size={16} className="shrink-0" />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving || loading}
                className="col-span-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
              >

                {saving ? (
                  <>
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave size={16} className="shrink-0" />
                    Save Changes
                  </>
                )}

              </button>

            </>

          )}

        </div>

      </div>

      </>
      )}

    </div>
  );

}

export default OfficeLocationPanel;
