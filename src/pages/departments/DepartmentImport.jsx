import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiUploadCloud } from "react-icons/fi";

import ImportDropZone from "../../components/departments/import/ImportDropZone";
import ImportPlanPanel from "../../components/departments/import/ImportPlanPanel";
import ImportResultPanel from "../../components/departments/import/ImportResultPanel";
import ImportHistoryPanel from "../../components/departments/import/ImportHistoryPanel";

import useDepartmentImport, {
  IMPORT_PHASE,
} from "../../hooks/useDepartmentImport";
import { IMPORT_STATUS } from "../../utils/departments/departmentImportConstants";

/*
|--------------------------------------------------------------------------
| Import Departments
|--------------------------------------------------------------------------
| Bringing a company's organisation chart in from a spreadsheet, instead of
| typing it in one department and one designation at a time.
|
| One screen. Pick a file, read what it will add, press the button - there is
| no wizard, because a department file has nothing a wizard could ask about. It
| carries two columns of names: no dates that could mean two different days, no
| status words to translate, no employee to match against. Every step would be
| a screen with one obvious answer on it.
|
| The page is the shell and nothing else: every decision - what the file says,
| whether a row can be imported, what is written - belongs to
| `useDepartmentImport` and the utilities beneath it. There is no Firebase call
| in this file.
|
| The route is guarded by `departments.import` in the permission registry, so a
| role without it cannot reach this page by typing its address. It is off by
| default for every managed role, including HR.
|
| Nothing this screen can do is destructive. It never renames and never deletes,
| and a department that already exists is matched and added to rather than
| created again - checked once when the file is read, and once more inside the
| service on the near side of the write. That is why there is no confirmation
| dialog in front of the button: the friction would guard nothing.
|--------------------------------------------------------------------------
*/

function DepartmentImport() {

  const navigate = useNavigate();

  const [historyKey, setHistoryKey] = useState(0);

  const {

    phase,
    error,

    file,
    headers,
    rowCount,
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

  } = useDepartmentImport();

  const handleSelectFile = async (picked) => {

    const outcome = await selectFile(picked);

    if (outcome?.success) {
      toast.success(
        `${outcome.rows.toLocaleString()} rows read from ${picked.name}.`
      );
    }

  };

  const handleImport = async () => {

    const outcome = await runImport();

    if (!outcome?.success) return;

    setHistoryKey((key) => key + 1);

    if (outcome.status === IMPORT_STATUS.COMPLETED) {

      if (
        outcome.departmentsCreated === 0 &&
        outcome.designationsCreated === 0
      ) {
        toast.info("Everything in this file already existed. Nothing was added.");
        return;
      }

      toast.success(
        `${outcome.departmentsCreated.toLocaleString()} departments and ${outcome.designationsCreated.toLocaleString()} designations added.`
      );

      return;

    }

    if (outcome.status === IMPORT_STATUS.COMPLETED_WITH_ERRORS) {
      toast.warning(
        "The import finished, but some departments could not be written."
      );
      return;
    }

    toast.error("The import failed. Nothing was written.");

  };

  /* The history is worth showing before a file is picked and after a run. */
  const showHistory =
    phase === IMPORT_PHASE.EMPTY ||
    phase === IMPORT_PHASE.READING ||
    phase === IMPORT_PHASE.DONE;

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/*
        The way back is the eyebrow itself rather than a separate boxed arrow,
        the same anatomy every sub-page header in this product uses.
      */}
      <div className="min-w-0">

        <button
          type="button"
          onClick={() => navigate("/departments")}
          aria-label="Back to departments"
          className="mb-1.5 flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand transition-colors hover:text-brand-hover"
        >

          <FiArrowLeft className="shrink-0" size={14} />

          <span className="flex shrink-0 items-center text-sm" aria-hidden="true">
            <FiUploadCloud />
          </span>

          <span className="truncate">Departments</span>

        </button>

        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Import Departments
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">
          Add departments and designations from a spreadsheet. Anything you
          already have is left exactly as it is.
        </p>

      </div>

      {(phase === IMPORT_PHASE.EMPTY || phase === IMPORT_PHASE.READING) && (
        <ImportDropZone
          reading={phase === IMPORT_PHASE.READING}
          error={error}
          onSelect={handleSelectFile}
        />
      )}

      {(phase === IMPORT_PHASE.READY || phase === IMPORT_PHASE.IMPORTING) && (
        <ImportPlanPanel
          file={file}
          rowCount={rowCount}
          headers={headers}
          mapping={mapping}
          onMapColumn={mapColumn}
          departmentMapped={departmentMapped}
          rows={rows}
          plan={plan}
          summary={summary}
          importing={phase === IMPORT_PHASE.IMPORTING}
          progress={progress}
          error={error}
          onClear={clearFile}
          onImport={handleImport}
          onCancel={cancelImport}
        />
      )}

      {phase === IMPORT_PHASE.DONE && (
        <ImportResultPanel
          result={result}
          rows={rows}
          fileName={file?.name}
          onImportAnother={clearFile}
          onViewDepartments={() => navigate("/departments")}
        />
      )}

      {showHistory && (
        <ImportHistoryPanel
          companyCode={companyCode}
          refreshKey={historyKey}
        />
      )}

    </div>
  );

}

export default DepartmentImport;
