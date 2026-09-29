import { useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { formatDate } from "../../../utils/attendance/attendanceDate";
import { IMPORT_MODE } from "../../../utils/attendance/attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Import Confirmation
|--------------------------------------------------------------------------
| The last thing between a preview and a year of somebody's attendance.
|
| It states the whole outcome rather than asking "are you sure": how many days
| are being written, how many are being left alone, and how many are not coming
| in at all. Somebody who scrolled past the preview should still be able to
| stop here knowing what they are agreeing to.
|
| Replacing existing records asks for more than a click. The confirmation
| phrase is deliberately not a second OK button: it is the one action on this
| screen that destroys attendance nobody can get back, and the friction is the
| point. Skipping - the default - has no such gate, because it cannot lose
| anything.
|
| Focus moves into the dialog on open and Escape closes it, so the modal
| behaves like a dialog for somebody who never touches the mouse.
|--------------------------------------------------------------------------
*/

const CONFIRM_PHRASE = "REPLACE";

/*
| The dialog itself, mounted only while it is open.
|
| Split from the wrapper below so the confirmation phrase starts empty every
| time it opens without an effect having to clear it: an unmounted component
| has no state to reset, and a phrase left over from a cancelled replace is
| exactly the state this dialog must never open holding.
*/

function ConfirmDialog({ summary, mode, fileName, onCancel, onConfirm }) {

  const [phrase, setPhrase] = useState("");

  const dialogRef = useRef(null);

  const closeRef = useRef(null);

  const replacing =
    mode === IMPORT_MODE.REPLACE && summary.existing > 0;

  useEffect(() => {

    closeRef.current?.focus();

    const onKeyDown = (event) => {

      if (event.key === "Escape") {
        onCancel();
        return;
      }

      /*
      | Tab is trapped inside the dialog. Without it, tabbing out lands on the
      | preview behind the overlay - a page that is still there, still
      | clickable to a screen reader, and no longer the thing being decided.
      */
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], select, textarea'
      );

      if (!focusable?.length) return;

      const first = focusable[0];

      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }

    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);

  }, [onCancel]);

  const confirmed = !replacing || phrase.trim().toUpperCase() === CONFIRM_PHRASE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-confirm-title"
        className="ui-card ui-scroll max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none sm:rounded-2xl"
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <div
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                replacing
                  ? "bg-red-50 text-red-600"
                  : "bg-brand-ring text-brand"
              }`}
            >
              {replacing ? <FiAlertTriangle size={20} /> : <FiUploadCloud size={20} />}
            </div>

            <div className="min-w-0">

              <h2 id="import-confirm-title" className="ui-card-title">
                Import Attendance?
              </h2>

              <p className="ui-card-subtitle truncate" title={fileName}>
                {fileName}
              </p>

            </div>

          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="ui-icon-btn shrink-0"
          >
            <FiX />
          </button>

        </div>

        {/* What will happen */}
        <div className="space-y-3 px-5 py-5 sm:px-6">

          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3">

            <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />

            <p className="text-sm text-emerald-900">
              <span className="font-bold">
                {summary.newRecords.toLocaleString()} attendance{" "}
                {summary.newRecords === 1 ? "record" : "records"}
              </span>{" "}
              will be written
              {summary.firstDate && (
                <>
                  , covering {formatDate(summary.firstDate)} to{" "}
                  {formatDate(summary.lastDate)} for{" "}
                  {summary.employees.toLocaleString()}{" "}
                  {summary.employees === 1 ? "employee" : "employees"}
                </>
              )}
              .
            </p>

          </div>

          {summary.existing > 0 && (
            <div
              className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                replacing ? "bg-red-50" : "bg-blue-50"
              }`}
            >

              <FiAlertTriangle
                className={`mt-0.5 shrink-0 ${
                  replacing ? "text-red-600" : "text-blue-600"
                }`}
              />

              <p className={`text-sm ${replacing ? "text-red-900" : "text-blue-900"}`}>
                <span className="font-bold">
                  {summary.existing.toLocaleString()} existing{" "}
                  {summary.existing === 1 ? "record" : "records"}
                </span>{" "}
                will be {replacing ? "replaced" : "left exactly as they are"}.
              </p>

            </div>
          )}

          {summary.errors > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3">

              <FiX className="mt-0.5 shrink-0 text-ink-subtle" />

              <p className="text-sm text-ink-muted">
                <span className="font-bold">
                  {summary.errors.toLocaleString()} invalid{" "}
                  {summary.errors === 1 ? "row" : "rows"}
                </span>{" "}
                will not be imported.
              </p>

            </div>
          )}

          {replacing && (

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">

              <p className="text-sm font-semibold text-red-900">
                This will replace existing attendance records and cannot be
                automatically undone.
              </p>

              <label
                htmlFor="import-confirm-phrase"
                className="mt-3 block text-xs font-semibold text-red-800"
              >
                Type {CONFIRM_PHRASE} to continue
              </label>

              <input
                id="import-confirm-phrase"
                type="text"
                value={phrase}
                autoComplete="off"
                onChange={(event) => setPhrase(event.target.value)}
                className="ui-field mt-1.5 w-full border-red-300"
                placeholder={CONFIRM_PHRASE}
              />

            </div>

          )}

        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-line bg-surface-muted px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

          <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary">
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed}
            className={`ui-btn font-semibold ${
              replacing
                ? "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:hover:bg-red-600"
                : "ui-btn-primary"
            }`}
          >
            <FiUploadCloud />
            {replacing ? "Replace & Import" : "Start Import"}
          </button>

        </div>

      </div>

    </div>
  );

}

function ImportConfirmModal({ open, ...props }) {

  if (!open) return null;

  return <ConfirmDialog {...props} />;

}

export default ImportConfirmModal;
