import { useCallback, useMemo, useRef, useState } from "react";

import useAuth from "./useAuth";
import useEmployeeDirectory from "./useEmployeeDirectory";
import useManagerScope from "./useManagerScope";

import { getHolidaysForYears } from "../services/holidayServices/holidayService";
import { getHolidayDates } from "../utils/holiday/holidayUtils";
import {
  completeImportRun,
  generateImportId,
  getExistingAttendanceIndex,
  importAttendanceRecords,
  startImportRun,
} from "../services/attendanceServices/attendanceImportService";

import { getCurrentEmployeeId } from "../utils/attendance/attendanceRequestUtils";
import {
  DATE_FORMAT,
  IMPORT_FIELD,
  IMPORT_MODE,
  IMPORT_STATUS,
  IMPORT_STEP,
  REQUIRED_IMPORT_FIELDS,
} from "../utils/attendance/attendanceImportConstants";
import {
  autoDetectMapping,
  collectUnknownStatuses,
  detectDateAmbiguity,
} from "../utils/attendance/attendanceImportNormalize";
import { readAttendanceImportFile } from "../utils/attendance/attendanceImportParse";
import {
  applyExistingRecords,
  buildImportRows,
  getImportYears,
  markInternalDuplicates,
  matchImportRows,
  summarizeImportRows,
} from "../utils/attendance/attendanceImportValidation";

/*
|--------------------------------------------------------------------------
| Attendance Import
|--------------------------------------------------------------------------
| The wizard's state, and the order it is allowed to move through.
|
| The page renders; this decides. Every judgement it makes comes from the
| import utilities and every read and write goes through the import service, so
| there is no Firebase call and no validation rule anywhere in the components -
| the same split the rest of the attendance module is built on.
|
| The steps are a sequence and not a set of screens: each one needs something
| the one before it produced, and a step can only be entered once that thing
| exists. Upload produces the columns, mapping produces the fields, matching
| produces the employees, validation produces the collisions with what is
| already stored.
|
| Two things are read from the database and both are read exactly once per
| file: the employee directory, and the month nodes the file touches. Neither
| is read per row. Everything after that is recomputed in memory, which is what
| lets the import mode be changed on the preview screen and the whole file be
| re-judged against it without going back to Firebase.
|--------------------------------------------------------------------------
*/

const emptyProgress = {
  total: 0,
  imported: 0,
  failed: 0,
  processed: 0,
  batches: { total: 0, succeeded: 0, failed: 0 },
};

function useAttendanceImport() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const {
    directory,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  /*
  | Whether the directory has ever arrived. A reload keeps the employees it
  | already has, so this stays true while one is in flight - which is what lets
  | the wizard re-check for newly added employees without the page falling back
  | to its opening loader and losing the step the user is on.
  */
  const hasDirectory = Object.keys(directory).length > 0;

  const { scope, loading: scopeLoading } = useManagerScope();

  const [step, setStep] = useState(IMPORT_STEP.UPLOAD);

  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  const [mapping, setMapping] = useState({});
  const [dateFormat, setDateFormat] = useState(DATE_FORMAT.AUTO);
  const [statusOverrides, setStatusOverrides] = useState({});

  const [mode, setMode] = useState(IMPORT_MODE.SKIP);

  /*
  | Whether the user has confirmed the mapping and asked for the rows to be
  | judged. Before that there is nothing to judge them against - the mapping is
  | still being edited - so the rows below stay empty.
  */
  const [matched, setMatched] = useState(false);

  /*
  | What the database said: which employee-and-day pairs already have a record,
  | and which days are declared holidays.
  |
  | Held as state rather than in a ref because the rows are derived from them -
  | a value the render reads has to be one React knows about, or a completed
  | read would not re-judge the file. Both are replaced wholesale rather than
  | mutated, so the identity change is the signal.
  */
  const [existing, setExisting] = useState(() => new Map());

  const [holidaySet, setHolidaySet] = useState(() => new Set());

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [progress, setProgress] = useState(emptyProgress);
  const [result, setResult] = useState(null);

  const importIdRef = useRef("");

  const abortRef = useRef(null);

  const importedBy =
    getCurrentEmployeeId(currentUser) ||
    currentUser?.name ||
    currentUser?.email ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Column Values
  |--------------------------------------------------------------------------
  | The date and status columns pulled out once per mapping change, so the two
  | questions the mapping step asks - is any date ambiguous, and is any status
  | unrecognised - are each one pass over the file rather than one per render.
  */

  const dateValues = useMemo(() => {

    const index = mapping[IMPORT_FIELD.DATE];

    if (index === undefined || index === null) return [];

    return rawRows.map((row) => row.cells[index]);

  }, [rawRows, mapping]);

  const statusValues = useMemo(() => {

    const index = mapping[IMPORT_FIELD.STATUS];

    if (index === undefined || index === null) return [];

    return rawRows.map((row) => row.cells[index]);

  }, [rawRows, mapping]);

  const dateAmbiguity = useMemo(() => {

    if (dateFormat !== DATE_FORMAT.AUTO) {
      return { ambiguous: false, sample: "" };
    }

    return detectDateAmbiguity(dateValues);

  }, [dateValues, dateFormat]);

  const unknownStatuses = useMemo(
    () => collectUnknownStatuses(statusValues, statusOverrides),
    [statusValues, statusOverrides]
  );

  /*
  | Mandatory mapping. Both fields are parts of the path a record is written
  | to, so neither can be left out and neither has a sensible default.
  */

  const missingRequiredFields = useMemo(
    () =>
      REQUIRED_IMPORT_FIELDS.filter(
        (field) =>
          mapping[field.key] === undefined || mapping[field.key] === null
      ),
    [mapping]
  );

  const canLeaveMapping =
    missingRequiredFields.length === 0 &&
    !dateAmbiguity.ambiguous &&
    unknownStatuses.length === 0;

  /*
  |--------------------------------------------------------------------------
  | Step One - The File
  |--------------------------------------------------------------------------
  */

  const selectFile = useCallback(async (picked) => {

    setError("");
    setBusy("parsing");

    try {

      const parsed = await readAttendanceImportFile(picked);

      if (!parsed.success) {
        setError(parsed.message);
        setFile(null);
        return { success: false, message: parsed.message };
      }

      setFile(picked);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      /*
      | A first guess at the columns, made the moment the file is read so the
      | mapping step opens already filled in. It is only a guess and every
      | field stays editable - see `autoDetectMapping`.
      */
      setMapping(autoDetectMapping(parsed.headers));

      setDateFormat(DATE_FORMAT.AUTO);
      setStatusOverrides({});
      setMatched(false);
      setResult(null);
      setProgress(emptyProgress);

      setStep(IMPORT_STEP.MAP);

      return { success: true, rows: parsed.rows.length };

    } finally {

      setBusy("");

    }

  }, []);

  const clearFile = useCallback(() => {

    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setStatusOverrides({});
    setDateFormat(DATE_FORMAT.AUTO);
    setMatched(false);
    setResult(null);
    setProgress(emptyProgress);
    setError("");
    setStep(IMPORT_STEP.UPLOAD);

  }, []);

  const mapColumn = useCallback((fieldKey, columnIndex) => {

    setMapping((current) => {

      const next = { ...current };

      if (columnIndex === "" || columnIndex === null) {
        delete next[fieldKey];
        return next;
      }

      next[fieldKey] = Number(columnIndex);

      return next;

    });

  }, []);

  const mapStatus = useCallback((statusKey, status) => {

    setStatusOverrides((current) => {

      const next = { ...current };

      if (!status) {
        delete next[statusKey];
        return next;
      }

      next[statusKey] = status;

      return next;

    });

  }, []);

  /*
  |--------------------------------------------------------------------------
  | The Pipeline
  |--------------------------------------------------------------------------
  | Rows are always rebuilt from the raw file rather than patched in place.
  |
  | Every stage adds errors and warnings to a row, so re-running one over rows
  | that had already been through it would report the same problem twice - and
  | changing the import mode on the preview screen has to re-run the last stage,
  | because whether a day is skipped or replaced is exactly what that stage
  | decides. Rebuilding is cheap: it is four passes over an array with no
  | network in any of them.
  */

  const rows = useMemo(() => {

    if (!matched || rawRows.length === 0) return [];

    const built = buildImportRows({
      rows: rawRows,
      mapping,
      dateFormat,
      statusOverrides,
    });

    matchImportRows(built, { directory, scope });

    markInternalDuplicates(built);

    applyExistingRecords(built, {
      existing,
      holidaySet,
      mode,
    });

    return built;

  }, [
    matched,
    rawRows,
    mapping,
    dateFormat,
    statusOverrides,
    directory,
    scope,
    mode,
    existing,
    holidaySet,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Step Three - Matching
  |--------------------------------------------------------------------------
  | The directory is already loaded, so this is a pass over the rows and no
  | reads at all. The collision checks have nothing to work with yet - the
  | existing index is still empty - which is deliberate: matching is shown on
  | its own so a file full of unknown employee ids is caught before anybody
  | waits on a month of reads.
  */

  const runMatching = useCallback(() => {

    setError("");

    /*
    | Matching is shown before anything has been read from the attendance tree,
    | so the collision checks are given nothing to work with and report nothing.
    | Clearing them matters when the user has been back to the mapping step:
    | the index that was read belonged to the previous mapping's dates.
    */
    setExisting(new Map());

    setHolidaySet(new Set());

    setMatched(true);

    setStep(IMPORT_STEP.MATCH);

  }, []);

  /*
  |--------------------------------------------------------------------------
  | Re-checking After Employees Are Added
  |--------------------------------------------------------------------------
  | The way back from "these employees do not exist".
  |
  | An attendance file cannot create an employee - it has an id and no name,
  | email, department or joining date - so the answer to an unmatched row is to
  | on-board the person and come back. This reloads the directory and re-judges
  | the file against it, so coming back does not mean starting the import
  | again: the file, the mapping and the answers already given are all still
  | here.
  |
  | Nothing has to be recomputed by hand afterwards. The rows are derived from
  | the directory, so a reloaded directory re-matches every row on its own.
  */

  const recheckEmployees = useCallback(() => {

    setError("");

    reloadDirectory();

  }, [reloadDirectory]);

  /*
  |--------------------------------------------------------------------------
  | Step Four - Validation Against What Is Already Stored
  |--------------------------------------------------------------------------
  | The only step that reads. One read per month the file touches for the
  | existing records, and one per year for the holiday calendar.
  |
  | A holiday calendar that cannot be read is not fatal: holidays only ever
  | raise a warning here, so the import continues without them and says so.
  | An unreadable month is fatal, because the alternative is treating days the
  | importer could not see as days that do not exist.
  */

  const runValidation = useCallback(async () => {

    setError("");
    setBusy("validating");

    try {

      const [existingResult, holidays] = await Promise.all([

        getExistingAttendanceIndex(companyCode, rows),

        getHolidaysForYears(companyCode, getImportYears(rows)).catch(
          (holidayError) => {

            console.error(
              "Failed to load holidays for the attendance import:",
              holidayError
            );

            return [];

          }
        ),

      ]);

      setExisting(existingResult.existing);

      setHolidaySet(new Set(getHolidayDates(holidays)));

      setStep(IMPORT_STEP.VALIDATE);

      return { success: true };

    } catch (validationError) {

      setError(
        validationError.message ||
          "Could not check this file against your existing attendance."
      );

      return { success: false };

    } finally {

      setBusy("");

    }

  }, [companyCode, rows]);

  /*
  | Changing the mode on the preview re-judges the whole file against it, using
  | the index that has already been read. The rows are derived from the mode,
  | so setting it is the whole change - and no second Firebase read is needed
  | to answer a question the index already answered.
  */

  const changeMode = useCallback((nextMode) => {
    setMode(nextMode);
  }, []);

  const goToPreview = useCallback(() => {
    setStep(IMPORT_STEP.PREVIEW);
  }, []);

  const goToStep = useCallback((next) => {
    setError("");
    setStep(next);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Step Six - The Import
  |--------------------------------------------------------------------------
  | The audit entry is opened before the first batch and closed after the last,
  | so a run that is abandoned halfway - a closed tab, a dropped connection -
  | is still on record as having started rather than leaving days in the tree
  | that nothing accounts for.
  |
  | Neither audit write is allowed to fail the import: the service already
  | swallows and logs both. Attendance that is in the database is in the
  | database whether or not the note about it was written.
  */

  const runImport = useCallback(async () => {

    if (!companyCode) {
      setError("Company not found.");
      return { success: false };
    }

    const summary = summarizeImportRows(rows, mode);

    if (summary.newRecords === 0) {
      setError("There is nothing to import.");
      return { success: false };
    }

    const importId = generateImportId(companyCode);

    importIdRef.current = importId;

    const controller = new AbortController();

    abortRef.current = controller;

    setError("");
    setProgress({ ...emptyProgress, total: summary.newRecords });
    setStep(IMPORT_STEP.IMPORTING);
    setBusy("importing");

    const runMeta = {
      importId,
      fileName: file?.name || "",
      fileSize: file?.size || 0,
      mode,
      importedBy,
      totalRows: summary.total,
      dateRange: { from: summary.firstDate, to: summary.lastDate },
    };

    await startImportRun(companyCode, {
      ...runMeta,
      importedRows: 0,
      skippedRows: summary.existing,
      failedRows: 0,
      invalidRows: summary.errors,
    });

    let outcome;

    try {

      outcome = await importAttendanceRecords(companyCode, rows, {
        mode,
        importId,
        importedBy,
        signal: controller.signal,
        onProgress: setProgress,
      });

    } catch (importError) {

      console.error("Attendance import failed:", importError);

      outcome = {
        total: summary.newRecords,
        imported: 0,
        failed: summary.newRecords,
        processed: 0,
        failedRows: [],
        batches: { total: 0, succeeded: 0, failed: 0 },
        cancelled: false,
      };

      setError(
        importError.message ||
          "The import could not be completed. No further records were written."
      );

    }

    /*
    | The status is decided by what actually landed, never by the absence of a
    | thrown error. A run where three batches succeeded and one did not is
    | completed with errors, and saying otherwise is how somebody finds out
    | months later that a fortnight is missing.
    */
    const status =
      outcome.imported === 0
        ? IMPORT_STATUS.FAILED
        : outcome.failed > 0 || outcome.cancelled
          ? IMPORT_STATUS.COMPLETED_WITH_ERRORS
          : IMPORT_STATUS.COMPLETED;

    await completeImportRun(companyCode, {
      ...runMeta,
      importedRows: outcome.imported,
      skippedRows: summary.existing,
      failedRows: outcome.failed,
      invalidRows: summary.errors,
      status,
    });

    setResult({ ...outcome, status, importId, summary });

    setBusy("");

    setStep(IMPORT_STEP.COMPLETE);

    abortRef.current = null;

    return { success: true, status, imported: outcome.imported };

  }, [companyCode, rows, mode, file, importedBy]);

  const cancelImport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {

    setExisting(new Map());
    setHolidaySet(new Set());

    importIdRef.current = "";

    clearFile();

  }, [clearFile]);

  const summary = useMemo(
    () => summarizeImportRows(rows, mode),
    [rows, mode]
  );

  return {

    // Where the wizard is
    step,
    goToStep,
    busy,
    error,

    // The file
    file,
    headers,
    rowCount: rawRows.length,
    selectFile,
    clearFile,

    // Mapping
    mapping,
    mapColumn,
    missingRequiredFields,
    dateFormat,
    setDateFormat,
    dateAmbiguity,
    unknownStatuses,
    mapStatus,
    statusOverrides,
    canLeaveMapping,

    // Rows
    rows,
    summary,

    // Mode
    mode,
    changeMode,

    // Moving on
    runMatching,
    runValidation,
    goToPreview,
    runImport,
    cancelImport,
    reset,

    /*
    | Re-matching after the missing employees have been added, without losing
    | the file or the mapping.
    */
    recheckEmployees,
    rechecking: directoryLoading,

    // The run
    progress,
    result,

    // Everything the wizard depends on being loaded
    directoryLoading,
    directoryError,
    hasDirectory,
    scopeLoading,
    scope,
    companyCode,

  };

}

export default useAttendanceImport;
