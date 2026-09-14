import { useCallback, useMemo, useRef, useState } from "react";

import useAuth from "./useAuth";

import { getDepartments } from "../services/departmentService";
import {
  completeImportRun,
  generateImportId,
  importDepartments,
  startImportRun,
} from "../services/departmentImportService";

import { getCurrentEmployeeId } from "../utils/attendance/attendanceRequestUtils";
import {
  IMPORT_FIELD,
  IMPORT_STATUS,
} from "../utils/departments/departmentImportConstants";
import { readDepartmentImportFile } from "../utils/departments/departmentImportParse";
import {
  autoDetectMapping,
  buildDepartmentIndex,
  buildImportPlan,
  buildImportRows,
  resolveImportRows,
  summarizeImportRows,
} from "../utils/departments/departmentImportValidation";

/*
|--------------------------------------------------------------------------
| Department Import
|--------------------------------------------------------------------------
| The state behind a one screen importer: pick a file, see exactly what will
| be added, press the button.
|
| There is no wizard here and that is the point. A department file carries two
| columns of names - it has no dates that could mean two different days, no
| status vocabulary to translate and no employee to be matched against - so
| there is nothing to ask that the file cannot answer on its own. Every step an
| attendance import needs would be a screen with one obvious answer on it, and
| a screen like that is a click, not a safeguard.
|
| So picking the file does the whole job in one go: it is parsed, its columns
| are detected, the company's departments are read, and every row is judged
| against them. What comes back is the finished answer to "what will this do",
| and the only thing left is whether to do it.
|
| The column pickers still exist and still work - the page shows them when the
| detection is unsure, or on request - because a heading is a guess about
| meaning. What has gone is being made to confirm a guess that was right.
|
| Nothing here talks to Firebase directly and nothing here decides anything: the
| judgements come from the import utilities and the reads and writes go through
| the services, which is the same split the rest of the product uses.
|--------------------------------------------------------------------------
*/

const emptyProgress = {
  total: 0,
  imported: 0,
  failed: 0,
  processed: 0,
  departmentsCreated: 0,
  designationsCreated: 0,
  batches: { total: 0, succeeded: 0, failed: 0 },
};

/*
| Where the screen is. Not a sequence of steps somebody walks through - the
| file moves through these on its own, and only IMPORTING is ever waited on.
*/

export const IMPORT_PHASE = {
  EMPTY: "empty",
  READING: "reading",
  READY: "ready",
  IMPORTING: "importing",
  DONE: "done",
};

function useDepartmentImport() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const [phase, setPhase] = useState(IMPORT_PHASE.EMPTY);

  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  const [mapping, setMapping] = useState({});

  /*
  | The company's departments, indexed by the key a name is matched on.
  |
  | Held as state rather than in a ref because the rows are derived from it - a
  | value the render reads has to be one React knows about, or a completed read
  | would not re-judge the file. Replaced wholesale rather than mutated, so the
  | identity change is the signal.
  |
  | It is read when the file is picked, and read again by the service on the
  | near side of the write. This copy decides what the screen promises; that one
  | decides what is actually written, and it is the one that makes creating a
  | department twice impossible.
  */
  const [index, setIndex] = useState(() => new Map());

  const [error, setError] = useState("");

  const [progress, setProgress] = useState(emptyProgress);
  const [result, setResult] = useState(null);

  const abortRef = useRef(null);

  const importedBy =
    getCurrentEmployeeId(currentUser) ||
    currentUser?.name ||
    currentUser?.email ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Picking The File
  |--------------------------------------------------------------------------
  | Parse, detect the columns, read the departments and judge the file, in that
  | order and without stopping in between.
  |
  | The read and the parse are not run in parallel. A file that cannot be read
  | is the commonest failure by far, and there is no point asking the database
  | for anything until the file has turned out to be a file.
  */

  const selectFile = useCallback(
    async (picked) => {

      if (!companyCode) {
        setError("Company not found.");
        return { success: false };
      }

      setError("");
      setPhase(IMPORT_PHASE.READING);

      const parsed = await readDepartmentImportFile(picked);

      if (!parsed.success) {
        setError(parsed.message);
        setFile(null);
        setPhase(IMPORT_PHASE.EMPTY);
        return { success: false, message: parsed.message };
      }

      let departmentIndex;

      try {

        departmentIndex = buildDepartmentIndex(
          await getDepartments(companyCode)
        );

      } catch (readError) {

        console.error("Failed to load departments for the import:", readError);

        setError(
          "Could not check this file against your existing departments. Nothing has been imported."
        );

        setFile(null);
        setPhase(IMPORT_PHASE.EMPTY);

        return { success: false };

      }

      setFile(picked);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      /*
      | The columns, worked out from the headings. It is a guess and every
      | field stays editable - see `autoDetectMapping` - but it is right often
      | enough that confirming it would be the only thing a mapping step did.
      */
      setMapping(autoDetectMapping(parsed.headers));

      setIndex(departmentIndex);

      setResult(null);
      setProgress(emptyProgress);

      setPhase(IMPORT_PHASE.READY);

      return { success: true, rows: parsed.rows.length };

    },
    [companyCode]
  );

  const clearFile = useCallback(() => {

    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setIndex(new Map());
    setResult(null);
    setProgress(emptyProgress);
    setError("");
    setPhase(IMPORT_PHASE.EMPTY);

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

  /*
  |--------------------------------------------------------------------------
  | What The File Would Do
  |--------------------------------------------------------------------------
  | Rebuilt from the raw file whenever a column is remapped, never patched in
  | place: both stages add errors and warnings to a row, so re-running one over
  | rows that had been through it would report the same problem twice.
  |
  | Cheap enough to do on every keystroke of the pickers - two passes over an
  | array, with no network in either.
  */

  const rows = useMemo(() => {

    if (rawRows.length === 0) return [];

    const built = buildImportRows({ rows: rawRows, mapping });

    resolveImportRows(built, { index });

    return built;

  }, [rawRows, mapping, index]);

  /*
  | The flat file folded back into the shape the database holds. The screen
  | renders it and the service walks it, so what is shown is what is written.
  */

  const plan = useMemo(() => buildImportPlan(rows), [rows]);

  const summary = useMemo(() => summarizeImportRows(rows, plan), [rows, plan]);

  const departmentMapped =
    mapping[IMPORT_FIELD.DEPARTMENT] !== undefined &&
    mapping[IMPORT_FIELD.DEPARTMENT] !== null;

  /*
  |--------------------------------------------------------------------------
  | The Import
  |--------------------------------------------------------------------------
  | The audit entry is opened before the first batch and closed after the last,
  | so a run that is abandoned halfway - a closed tab, a dropped connection -
  | is still on record as having started rather than leaving departments in the
  | tree that nothing accounts for.
  |
  | Neither audit write is allowed to fail the import: the service already
  | swallows and logs both. Departments that are in the database are in the
  | database whether or not the note about it was written.
  */

  const runImport = useCallback(async () => {

    if (!companyCode) {
      setError("Company not found.");
      return { success: false };
    }

    if (summary.writes === 0) {
      setError("There is nothing to import.");
      return { success: false };
    }

    const importId = generateImportId(companyCode);

    const controller = new AbortController();

    abortRef.current = controller;

    setError("");
    setProgress({ ...emptyProgress, total: summary.writes });
    setPhase(IMPORT_PHASE.IMPORTING);

    const runMeta = {
      importId,
      fileName: file?.name || "",
      fileSize: file?.size || 0,
      importedBy,
      totalRows: summary.total,
    };

    await startImportRun(companyCode, {
      ...runMeta,
      departmentsCreated: 0,
      designationsCreated: 0,
      skippedRows: summary.existing,
      failedNodes: 0,
      invalidRows: summary.errors + summary.duplicates,
    });

    let outcome;

    try {

      outcome = await importDepartments(companyCode, plan, {
        importId,
        importedBy,
        signal: controller.signal,
        onProgress: setProgress,
      });

    } catch (importError) {

      console.error("Department import failed:", importError);

      outcome = {
        total: summary.writes,
        imported: 0,
        failed: summary.writes,
        processed: 0,
        departmentsCreated: 0,
        designationsCreated: 0,
        alreadyExisted: 0,
        failedRowNumbers: [],
        batches: { total: 0, succeeded: 0, failed: 0 },
        cancelled: false,
      };

      setError(
        importError.message ||
          "The import could not be completed. Nothing further was written."
      );

    }

    /*
    | The status is decided by what actually landed, never by the absence of a
    | thrown error.
    |
    | A run that wrote nothing because the final check found everything already
    | there is a success and not a failure: it did exactly what it should have,
    | which is nothing. Only a run that had work to do and did none of it has
    | failed.
    */
    const status =
      outcome.failed > 0 || outcome.cancelled
        ? outcome.imported === 0
          ? IMPORT_STATUS.FAILED
          : IMPORT_STATUS.COMPLETED_WITH_ERRORS
        : IMPORT_STATUS.COMPLETED;

    await completeImportRun(companyCode, {
      ...runMeta,
      departmentsCreated: outcome.departmentsCreated,
      designationsCreated: outcome.designationsCreated,
      skippedRows: summary.existing + (outcome.alreadyExisted || 0),
      failedNodes: outcome.failed,
      invalidRows: summary.errors + summary.duplicates,
      status,
    });

    setResult({ ...outcome, status, importId, summary });

    setPhase(IMPORT_PHASE.DONE);

    abortRef.current = null;

    return {
      success: true,
      status,
      departmentsCreated: outcome.departmentsCreated,
      designationsCreated: outcome.designationsCreated,
      alreadyExisted: outcome.alreadyExisted || 0,
    };

  }, [companyCode, plan, summary, file, importedBy]);

  const cancelImport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {

    phase,
    error,

    file,
    headers,
    rowCount: rawRows.length,
    selectFile,
    clearFile,

    mapping,
    mapColumn,
    departmentMapped,

    rows,
    plan,
    summary,

    runImport,
    cancelImport,

    progress,
    result,

    companyCode,

  };

}

export default useDepartmentImport;
