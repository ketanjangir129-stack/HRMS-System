import { useRef, useState } from "react";
import {
  FiAlertCircle,
  FiDownload,
  FiFile,
  FiInfo,
  FiLoader,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  ACCEPTED_IMPORT_TYPES,
  IMPORT_FIELDS,
  MAX_FILE_SIZE_MB,
} from "../../../utils/attendance/attendanceImportConstants";
import { formatFileSize } from "../../../utils/attendance/attendanceImportParse";

/*
|--------------------------------------------------------------------------
| Step One - Upload
|--------------------------------------------------------------------------
| The file, and what the file should contain.
|
| The guide is shown beside the drop zone rather than behind a button, because
| unlike the bulk on-boarding importer this one does not require the columns to
| be named anything in particular - the next step maps them - so the table here
| is describing what the importer can use, not laying down a format somebody
| has to match. That is a much shorter thing to read, and reading it before
| choosing a file saves the round trip of picking one that has no date column.
|
| A template is offered all the same, for anyone building the file by hand.
|
| Drag and drop and the file picker are the same handler. The drop zone is a
| label wrapping the input rather than a div with a click handler, so it is
| reachable by keyboard and announced as a file input without any aria of its
| own.
|--------------------------------------------------------------------------
*/

const downloadTemplate = () => {

  downloadCsv(
    "attendance-import-template.csv",
    IMPORT_FIELDS.map((field) => field.label),
    [
      ["EMP001", "2024-08-15", "09:28", "18:35", "Present", ""],
      ["EMP001", "2024-08-16", "09:52", "18:30", "Late", "Traffic"],
      ["EMP002", "2024-08-15", "", "", "Leave", "Casual leave"],
      ["EMP002", "2024-08-16", "09:15", "13:30", "Half Day", ""],
      ["EMP003", "2024-08-15", "", "", "Absent", ""],
    ]
  );

};

function ImportUploadStep({ file, busy, error, onSelect, onClear, onContinue }) {

  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);

  const parsing = busy === "parsing";

  const handleFiles = (files) => {

    const picked = files?.[0];

    if (!picked || parsing) return;

    onSelect(picked);

    /*
    | Picking the same file twice in a row must still fire onChange, which it
    | will not if the input still holds it.
    */
    if (inputRef.current) {
      inputRef.current.value = "";
    }

  };

  return (
    <div className="space-y-6">

      {/* The drop zone */}
      <div className="ui-card overflow-hidden">

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`m-4 rounded-2xl border-2 border-dashed transition-colors sm:m-6 ${
            dragging
              ? "border-brand bg-brand-ring/40"
              : "border-line bg-surface-muted"
          }`}
        >

          {file ? (

            /* A file is chosen: show what it is and let it be replaced. */
            <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-sm">
                  {parsing ? (
                    <FiLoader size={20} className="animate-spin" />
                  ) : (
                    <FiFile size={20} />
                  )}
                </div>

                <div className="min-w-0">

                  <p className="truncate font-semibold text-ink" title={file.name}>
                    {file.name}
                  </p>

                  <p className="text-xs text-ink-subtle">
                    {parsing
                      ? "Reading the file..."
                      : formatFileSize(file.size)}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={onClear}
                disabled={parsing}
                className="ui-btn ui-btn-secondary shrink-0"
              >
                <FiTrash2 />
                Remove
              </button>

            </div>

          ) : (

            <label
              className={`flex flex-col items-center px-5 py-12 text-center ${
                parsing ? "cursor-wait" : "cursor-pointer"
              }`}
            >

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-brand shadow-sm">
                {parsing ? (
                  <FiLoader size={24} className="animate-spin" />
                ) : (
                  <FiUploadCloud size={24} />
                )}
              </span>

              <span className="mt-4 text-base font-semibold text-ink">
                {parsing
                  ? "Reading your file..."
                  : "Choose your attendance file"}
              </span>

              <span className="mt-1.5 text-sm text-ink-subtle">
                Drag it here, or click to browse.
              </span>

              <span className="mt-0.5 text-sm text-ink-subtle">
                CSV or Excel, exported from your old system.
              </span>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_IMPORT_TYPES}
                disabled={parsing}
                className="sr-only"
                onChange={(event) => handleFiles(event.target.files)}
              />

              <span className="ui-btn ui-btn-primary mt-5 font-semibold">
                <FiFile />
                Browse Files
              </span>

              <span className="mt-3 text-xs text-ink-faint">
                {ACCEPTED_IMPORT_EXTENSIONS.join(", ")} · up to{" "}
                {MAX_FILE_SIZE_MB} MB
              </span>

            </label>

          )}

        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 sm:mb-6"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {file && !parsing && !error && (
          <div className="flex justify-end border-t border-line px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={onContinue}
              className="ui-btn ui-btn-primary w-full font-semibold sm:w-auto"
            >
              Continue to Mapping
            </button>
          </div>
        )}

      </div>

      {/* What the file can carry */}
      <div className="ui-card overflow-hidden">

        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="min-w-0">

            <h2 className="ui-card-title">
              What The File Should Contain
            </h2>

            <p className="ui-card-subtitle">
              Your columns can be named anything. You will match them up on the
              next step.
            </p>

          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="ui-btn ui-btn-secondary shrink-0 font-semibold"
          >
            <FiDownload />
            Download Template
          </button>

        </div>

        <div className="ui-scroll overflow-x-auto">

          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">

            <thead>
              <tr className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
                <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Field</th>
                <th scope="col" className="px-5 py-3 font-semibold">Required</th>
                <th scope="col" className="px-5 py-3 font-semibold">Example</th>
                <th scope="col" className="px-5 py-3 font-semibold sm:pr-6">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line-subtle">

              {IMPORT_FIELDS.map((field) => (

                <tr key={field.key} className="align-top">

                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink sm:px-6">
                    {field.label}
                  </td>

                  <td className="whitespace-nowrap px-5 py-3">
                    <span
                      className={`ui-badge ${
                        field.required
                          ? "bg-red-50 text-red-600"
                          : "bg-surface-raised text-ink-subtle"
                      }`}
                    >
                      {field.required ? "Required" : "Optional"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-ink-muted">
                    {field.example}
                  </td>

                  <td className="px-5 py-3 text-ink-subtle sm:pr-6">
                    {field.hint}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <div className="space-y-1.5 border-t border-line bg-surface-muted px-5 py-4 text-xs text-ink-subtle sm:px-6">

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            The first row with anything in it is read as the column headings.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            In an Excel workbook only the first sheet is read. Date and time
            cells are understood whether they are typed as text or as real
            Excel dates.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            Employees are matched on their Employee ID only, and must already
            exist. The importer never creates an employee.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            Imported days keep the status your file gives them. They are never
            recalculated against your current working hours.
          </p>

        </div>

      </div>

    </div>
  );

}

export default ImportUploadStep;
