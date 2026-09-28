import { useRef, useState } from "react";
import {
  FiAlertCircle,
  FiDownload,
  FiFile,
  FiInfo,
  FiLoader,
  FiUploadCloud,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  ACCEPTED_IMPORT_TYPES,
  IMPORT_FIELDS,
  MAX_FILE_SIZE_MB,
} from "../../../utils/departments/departmentImportConstants";

/*
|--------------------------------------------------------------------------
| The File
|--------------------------------------------------------------------------
| The drop zone, and what the file should contain.
|
| There is no Continue button under it. Picking the file is the whole of this
| step: it is read, its columns are detected and it is checked against the
| company's departments in one go, and what appears underneath is the finished
| answer rather than the next question.
|
| The guide sits beside the drop zone rather than behind a button, because the
| columns can be named anything - they are detected, and corrected on the panel
| below if the detection is unsure - so this table describes what the importer
| can use rather than a format somebody has to match.
|
| The template repeats the department down the rows on purpose. That is the
| shape a department with several roles has to take in a flat file, and it is
| the one thing about this format people get wrong: left to guess, they write
| the department once and leave the cells underneath it blank, which reads as a
| designation with no department.
|
| Drag and drop and the file picker are the same handler. The drop zone is a
| label wrapping the input rather than a div with a click handler, so it is
| reachable by keyboard and announced as a file input without any aria of its
| own.
|--------------------------------------------------------------------------
*/

const downloadTemplate = () => {

  downloadCsv(
    "department-import-template.csv",
    IMPORT_FIELDS.map((field) => field.label),
    [
      ["Engineering", "Backend Developer"],
      ["Engineering", "Frontend Developer"],
      ["Engineering", "QA Engineer"],
      ["Human Resources", "HR Executive"],
      ["Human Resources", "Recruiter"],
      ["Finance", "Accountant"],
      ["Operations", ""],
    ]
  );

};

function ImportDropZone({ reading, error, onSelect }) {

  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {

    const picked = files?.[0];

    if (!picked || reading) return;

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

          <label
            className={`flex flex-col items-center px-5 py-12 text-center ${
              reading ? "cursor-wait" : "cursor-pointer"
            }`}
          >

            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-brand shadow-sm">
              {reading ? (
                <FiLoader size={24} className="animate-spin" />
              ) : (
                <FiUploadCloud size={24} />
              )}
            </span>

            <span className="mt-4 text-base font-semibold text-ink">
              {reading
                ? "Reading your file..."
                : "Choose your department file"}
            </span>

            <span className="mt-1.5 text-sm text-ink-subtle">
              Drag it here, or click to browse.
            </span>

            <span className="mt-0.5 text-sm text-ink-subtle">
              CSV or Excel, with one row per designation.
            </span>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMPORT_TYPES}
              disabled={reading}
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

      </div>

      {/* What the file can carry */}
      <div className="ui-card overflow-hidden">

        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="min-w-0">

            <h2 className="ui-card-title">What The File Should Contain</h2>

            <p className="ui-card-subtitle">
              Your columns can be named anything - they are matched up for you.
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

          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">

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
            Repeat the department on every row. Three roles in Engineering are
            three rows, each one saying Engineering.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            The first row with anything in it is read as the column headings,
            and in an Excel workbook only the first sheet is read.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            Departments you already have are never created again. They are
            matched by name, ignoring case and punctuation, and only the
            designations they are missing get added.
          </p>

          <p className="flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0 text-ink-faint" />
            Nothing is ever renamed or deleted. Existing departments keep their
            name, their manager and every designation they already have.
          </p>

        </div>

      </div>

    </div>
  );

}

export default ImportDropZone;
