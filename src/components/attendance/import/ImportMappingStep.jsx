import { useId } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiColumns,
  FiTag,
} from "react-icons/fi";

import {
  DATE_FORMAT_OPTIONS,
  IMPORTABLE_STATUSES,
  IMPORT_FIELDS,
} from "../../../utils/attendance/attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Step Two - Map Columns
|--------------------------------------------------------------------------
| Which column of the file is which field of a day of attendance, and the two
| questions the file cannot answer on its own.
|
| The mapping is pre-filled from the column headings and every field is still a
| picker, because a heading is a guess about meaning: a column called "Status"
| holding shift codes would otherwise be imported as attendance statuses
| without anybody being asked.
|
| The two panels underneath appear only when they are needed, and until they
| are answered the step will not let go:
|
|   The date format, when a date in the file could be two different days.
|     01/02/2026 is the 1st of February and the 2nd of January and nothing in
|     the file says which. A migration filed a month out is not something that
|     gets noticed later.
|
|   Unknown statuses, when the file uses a word the importer does not know.
|     Asked once per distinct value rather than once per row, with the number
|     of rows carrying it, so a file with one typo is one question.
|--------------------------------------------------------------------------
*/

function FieldRow({ field, headers, value, onChange }) {

  const id = useId();

  const mapped = value !== undefined && value !== null;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">

      <div className="min-w-0 sm:w-64">

        <label htmlFor={id} className="flex items-center gap-2 font-semibold text-ink">

          {field.label}

          {field.required && (
            <span className="ui-badge bg-red-50 text-red-600">Required</span>
          )}

        </label>

        <p className="mt-0.5 text-xs text-ink-subtle">
          {field.hint}
        </p>

      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">

        <select
          id={id}
          value={mapped ? value : ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          aria-invalid={field.required && !mapped ? "true" : undefined}
          className={`ui-field min-w-0 flex-1 cursor-pointer ${
            field.required && !mapped ? "border-red-300" : ""
          }`}
        >

          <option value="">
            {field.required
              ? "Choose a column..."
              : "Not in this file"}
          </option>

          {headers.map((header) => (
            <option key={header.index} value={header.index}>
              {header.label}
            </option>
          ))}

        </select>

        {/*
          A tick that a required field is answered. Paired with the red border
          above rather than replacing it, so the state is never carried by
          colour alone.
        */}
        <span className="w-5 shrink-0">
          {mapped && (
            <FiCheckCircle
              className="text-emerald-600"
              aria-label={`${field.label} is mapped`}
            />
          )}
        </span>

      </div>

    </div>
  );

}

function ImportMappingStep({
  headers,
  mapping,
  onMapColumn,
  missingRequiredFields,
  dateFormat,
  onDateFormat,
  dateAmbiguity,
  unknownStatuses,
  statusOverrides,
  onMapStatus,
  canContinue,
  rowCount,
  onBack,
  onContinue,
}) {

  const formatId = useId();

  return (
    <div className="space-y-6">

      {/* The mapping itself */}
      <div className="ui-card overflow-hidden">

        <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">

          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-ring text-brand"
          >
            <FiColumns />
          </div>

          <div className="min-w-0">

            <h2 className="ui-card-title">Match Your Columns</h2>

            <p className="ui-card-subtitle">
              {rowCount.toLocaleString()} rows read. Check each field below -
              we have filled in what we could work out from your headings.
            </p>

          </div>

        </div>

        <div className="divide-y divide-line-subtle">

          {IMPORT_FIELDS.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              headers={headers}
              value={mapping[field.key]}
              onChange={onMapColumn}
            />
          ))}

        </div>

        {missingRequiredFields.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 border-t border-line bg-red-50 px-5 py-4 text-sm text-red-700 sm:px-6"
          >
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">
                Choose a column for{" "}
                {missingRequiredFields.map((field) => field.label).join(" and ")}.
              </span>{" "}
              Together they are the address each record is stored at, so neither
              can be left out.
            </p>
          </div>
        )}

      </div>

      {/*
        The date format. Only asked when the file genuinely cannot be read
        without an answer.
      */}
      {dateAmbiguity.ambiguous && (

        <div className="ui-card overflow-hidden border-amber-200">

          <div className="flex items-center gap-3 border-b border-line bg-amber-50 px-5 py-4 sm:px-6">

            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600"
            >
              <FiCalendar />
            </div>

            <div className="min-w-0">

              <h2 className="text-base font-semibold text-amber-900">
                Which Way Round Are Your Dates?
              </h2>

              <p className="text-xs text-amber-800">
                Your file contains{" "}
                <span className="font-mono font-semibold">
                  {dateAmbiguity.sample}
                </span>
                , which could be two different days. We will not guess.
              </p>

            </div>

          </div>

          <div className="px-5 py-4 sm:px-6">

            <label htmlFor={formatId} className="ui-label">
              Date format
            </label>

            <select
              id={formatId}
              value={dateFormat}
              onChange={(event) => onDateFormat(event.target.value)}
              className="ui-field mt-1.5 w-full cursor-pointer sm:max-w-md"
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-ink-subtle">
              {
                DATE_FORMAT_OPTIONS.find(
                  (option) => option.value === dateFormat
                )?.description
              }
            </p>

          </div>

        </div>

      )}

      {/* Statuses the importer does not recognise */}
      {unknownStatuses.length > 0 && (

        <div className="ui-card overflow-hidden border-amber-200">

          <div className="flex items-center gap-3 border-b border-line bg-amber-50 px-5 py-4 sm:px-6">

            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600"
            >
              <FiTag />
            </div>

            <div className="min-w-0">

              <h2 className="text-base font-semibold text-amber-900">
                Unrecognised Statuses
              </h2>

              <p className="text-xs text-amber-800">
                Tell us what these mean. Nothing is assumed - an unmapped status
                stops its rows rather than being imported as Present.
              </p>

            </div>

          </div>

          <div className="divide-y divide-line-subtle">

            {unknownStatuses.map((status) => (

              <div
                key={status.key}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
              >

                <div className="min-w-0 sm:w-64">

                  <p className="truncate font-mono font-semibold text-ink">
                    {status.value}
                  </p>

                  <p className="text-xs text-ink-subtle">
                    {status.count.toLocaleString()}{" "}
                    {status.count === 1 ? "row" : "rows"}
                  </p>

                </div>

                <select
                  value={statusOverrides[status.key] || ""}
                  onChange={(event) => onMapStatus(status.key, event.target.value)}
                  aria-label={`What does ${status.value} mean?`}
                  className="ui-field min-w-0 flex-1 cursor-pointer"
                >

                  <option value="">Choose a status...</option>

                  {IMPORTABLE_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}

                </select>

              </div>

            ))}

          </div>

        </div>

      )}

      {/* Actions */}
      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <button type="button" onClick={onBack} className="ui-btn ui-btn-secondary">
          <FiArrowLeft />
          Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="ui-btn ui-btn-primary font-semibold"
        >
          Match Employees
        </button>

      </div>

    </div>
  );

}

export default ImportMappingStep;
