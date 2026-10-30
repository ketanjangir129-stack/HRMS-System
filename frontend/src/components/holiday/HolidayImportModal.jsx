import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiLoader,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { getHolidaysForYears } from "../../services/holidayServices/holidayService";
import {
  HOLIDAY_IMPORT_ACCEPT,
  HOLIDAY_IMPORT_COLUMNS,
} from "../../utils/holiday/holidayConstants";
import {
  IMPORT_ROW_STATUS,
  buildImportRows,
  downloadHolidayTemplate,
  getImportYears,
  readHolidayImportFile,
} from "../../utils/holiday/holidayImport";
import { formatHolidayDate } from "../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "./common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Holiday Import Modal
|--------------------------------------------------------------------------
| Upload an Excel, CSV or PDF holiday list, check it, then import it.
|
| Nothing is written until the preview has been seen. The preview says which
| rows will be added, which are skipped because the date is already a
| holiday (in the calendar or earlier in the file), and which are wrong and
| why - so a bad row is fixed in the file rather than discovered later.
|--------------------------------------------------------------------------
*/

const STATUS_STYLES = {
  [IMPORT_ROW_STATUS.VALID]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [IMPORT_ROW_STATUS.DUPLICATE]: "bg-amber-50 text-amber-700 ring-amber-200",
  [IMPORT_ROW_STATUS.INVALID]: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_LABELS = {
  [IMPORT_ROW_STATUS.VALID]: "Ready",
  [IMPORT_ROW_STATUS.DUPLICATE]: "Skip",
  [IMPORT_ROW_STATUS.INVALID]: "Error",
};

function ImportForm({ companyCode, importing, onImport, onClose }) {

  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !importing) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [importing, onClose]);

  const counts = useMemo(() => ({
    valid: rows.filter((row) => row.status === IMPORT_ROW_STATUS.VALID).length,
    duplicate: rows.filter((row) => row.status === IMPORT_ROW_STATUS.DUPLICATE).length,
    invalid: rows.filter((row) => row.status === IMPORT_ROW_STATUS.INVALID).length,
  }), [rows]);

  const handleFile = async (selected) => {

    if (!selected || reading) return;

    setFile(selected);
    setRows([]);
    setFileError("");
    setReading(true);

    try {

      const { rows: fileRows, header } = await readHolidayImportFile(selected);

      // Existing holidays of every year in the file, so a clash shows now.
      const years = getImportYears(fileRows, header);
      const existing = years.length
        ? await getHolidaysForYears(companyCode, years, { force: true })
        : [];

      const built = buildImportRows(fileRows, header, existing);

      if (built.length === 0) {
        setFileError("No holiday rows were found under the header.");
      }

      setRows(built);

    } catch (error) {

      setFileError(error.message || "The file could not be read.");

    } finally {

      setReading(false);

      // Lets the same file be chosen again after it has been fixed.
      if (inputRef.current) inputRef.current.value = "";

    }

  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleImport = () => {

    const ready = rows.filter((row) => row.status === IMPORT_ROW_STATUS.VALID);

    if (ready.length === 0) {
      toast.error("There are no valid rows to import.");
      return;
    }

    onImport(ready, file);

  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">

      <div className="hide-scrollbar flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:max-h-[90vh]">

        {/* Header */}

        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
              <FiUploadCloud size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="ui-card-title">Import Holidays</h2>
              <p className="ui-card-subtitle truncate">
                Excel, CSV or PDF with the columns {HOLIDAY_IMPORT_COLUMNS.join(", ")}.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-8">

          {/* Drop zone */}

          <div
            role="button"
            tabIndex={0}
            onClick={() => !reading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging
                ? "border-brand bg-blue-50"
                : "border-line bg-surface-muted hover:border-blue-300"
            }`}
          >

            {reading ? (
              <FiLoader className="animate-spin text-blue-600" size={28} />
            ) : file ? (
              <FiFileText className="text-blue-600" size={28} />
            ) : (
              <FiUploadCloud className="text-blue-600" size={28} />
            )}

            <p className="text-sm font-semibold text-ink">
              {reading
                ? "Reading the file..."
                : file
                  ? file.name
                  : "Drop a file here or click to browse"}
            </p>

            <p className="text-xs text-ink-subtle">
              {file && !reading
                ? "Click to choose a different file"
                : ".xlsx, .xls, .csv or .pdf · up to 5 MB · 500 rows"}
            </p>

            <input
              ref={inputRef}
              type="file"
              accept={HOLIDAY_IMPORT_ACCEPT}
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />

          </div>

          {/* Template */}

          <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800 sm:flex-row sm:items-center sm:justify-between">

            <span>
              Required columns: <b>Date</b> (e.g. 2026-10-31 or 31/10/2026), <b>Name</b>, <b>Type</b> (National, Festival, Company, Event) and <b>Description</b>.
            </span>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => downloadHolidayTemplate("xlsx")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
              >
                <FiDownload size={13} /> Excel template
              </button>
              <button
                type="button"
                onClick={() => downloadHolidayTemplate("csv")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
              >
                <FiDownload size={13} /> CSV
              </button>
            </div>

          </div>

          {/* File error */}

          {fileError && (
            <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              {fileError}
            </p>
          )}

          {/* Preview */}

          {rows.length > 0 && (

            <div className="space-y-3">

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="ui-badge bg-emerald-50 text-emerald-700">{counts.valid} ready</span>
                <span className="ui-badge bg-amber-50 text-amber-700">{counts.duplicate} skipped</span>
                <span className="ui-badge bg-red-50 text-red-700">{counts.invalid} with errors</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-line">

                <table className="w-full min-w-[720px] text-left text-sm">

                  <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line-subtle">

                    {rows.map((row) => (

                      <tr key={row.rowNumber} className="align-top">

                        <td className="px-3 py-2.5 text-ink-faint">{row.rowNumber}</td>

                        <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                          {row.date ? formatHolidayDate(row.date) : (
                            <span className="text-red-600">{row.rawDate || "--"}</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-medium text-ink">{row.name || "--"}</td>

                        <td className="px-3 py-2.5">
                          {row.type ? (
                            <HolidayTypeBadge type={row.type} isOptional={row.isOptional} size="sm" />
                          ) : (
                            <span className="text-red-600">{row.rawType || "--"}</span>
                          )}
                        </td>

                        <td className="max-w-[240px] px-3 py-2.5 text-xs text-ink-subtle">
                          <span className="line-clamp-2">{row.description || "--"}</span>
                        </td>

                        <td className="px-3 py-2.5">

                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLES[row.status]}`}>
                            {STATUS_LABELS[row.status]}
                          </span>

                          {(row.errors.length > 0 || row.note) && (
                            <p className={`mt-1 max-w-[220px] text-[11px] ${row.errors.length ? "text-red-600" : "text-amber-700"}`}>
                              {row.errors.length ? row.errors.join(" ") : row.note}
                            </p>
                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

        {/* Footer */}

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">

          <p className="text-xs text-ink-subtle">
            {rows.length > 0
              ? `${counts.valid} of ${rows.length} rows will be imported.`
              : "Rows are checked before anything is saved."}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">

            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || reading || counts.valid === 0}
              className="ui-btn ui-btn-primary w-full font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {importing ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
              {importing
                ? "Importing..."
                : `Import ${counts.valid} ${counts.valid === 1 ? "Holiday" : "Holidays"}`}
            </button>

          </div>

        </div>

      </div>

    </div>

  );

}

// Mounted only while open, so every import starts from an empty form.
function HolidayImportModal({ open, ...props }) {

  if (!open) return null;

  return <ImportForm {...props} />;

}

export default HolidayImportModal;
