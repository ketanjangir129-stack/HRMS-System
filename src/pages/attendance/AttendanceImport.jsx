import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiUploadCloud } from "react-icons/fi";

import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import { ErrorState, LoadingState } from "../../components/attendance/common/AttendanceState";
import ImportStepper from "../../components/attendance/import/ImportStepper";
import ImportUploadStep from "../../components/attendance/import/ImportUploadStep";
import ImportMappingStep from "../../components/attendance/import/ImportMappingStep";
import ImportMatchStep from "../../components/attendance/import/ImportMatchStep";
import ImportValidateStep from "../../components/attendance/import/ImportValidateStep";
import ImportPreviewStep from "../../components/attendance/import/ImportPreviewStep";
import ImportConfirmModal from "../../components/attendance/import/ImportConfirmModal";
import ImportProgressStep from "../../components/attendance/import/ImportProgressStep";
import ImportCompleteStep from "../../components/attendance/import/ImportCompleteStep";
import ImportHistoryPanel from "../../components/attendance/import/ImportHistoryPanel";

import useAttendanceImport from "../../hooks/useAttendanceImport";
import { IMPORT_STATUS, IMPORT_STEP } from "../../utils/attendance/attendanceImportConstants";

/*
|--------------------------------------------------------------------------
| Import Attendance
|--------------------------------------------------------------------------
| Bringing a company's attendance history in from the system they were on
| before.
|
| The page is the wizard's shell and nothing else: it renders the step it is
| on, and every decision - what the file says, whether a row is importable,
| what is written - belongs to `useAttendanceImport` and the utilities beneath
| it. There is no Firebase call in this file, which is the same split every
| other attendance screen is built on.
|
| The route is guarded by `attendance.import` in the permission registry, so a
| role without it cannot reach this page by typing its address. A manager who
| can reach it is narrowed again by their department scope, which the matching
| step applies to every row and which the import service cannot be asked to
| bypass: a row outside the scope is an error rather than a hidden row.
|
| Reaching this screen is not the same as the database allowing the write. See
| the note in the import service and `docs/attendance-import-rules.md` for
| what the current authentication model can and cannot enforce.
|--------------------------------------------------------------------------
*/

function AttendanceImport() {

  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false);

  const [historyKey, setHistoryKey] = useState(0);

  const {

    step,
    goToStep,
    busy,
    error,

    file,
    headers,
    rowCount,
    selectFile,
    clearFile,

    mapping,
    mapColumn,
    missingRequiredFields,
    dateFormat,
    setDateFormat,
    dateAmbiguity,
    unknownStatuses,
    statusOverrides,
    mapStatus,
    canLeaveMapping,

    rows,
    summary,

    mode,
    changeMode,

    runMatching,
    runValidation,
    goToPreview,
    runImport,
    cancelImport,
    reset,

    recheckEmployees,
    rechecking,

    progress,
    result,

    directoryLoading,
    directoryError,
    hasDirectory,
    scopeLoading,
    scope,
    companyCode,

  } = useAttendanceImport();

  /*
  | The employee directory is what every row is matched against, so the wizard
  | waits for it rather than opening on a screen that would report the whole
  | file as unmatched. The department scope is waited on for the same reason:
  | a manager whose departments have not resolved yet would be shown rows they
  | are about to be told they cannot import.
  |
  | Only the *first* load blocks. Re-checking after employees are added reloads
  | the same directory, and blocking on that would unmount the wizard mid
  | import and throw away the file, the mapping and the step - which is exactly
  | what the re-check exists to avoid. A reload keeps the employees it already
  | has, so `hasDirectory` stays true throughout it.
  */
  const loadingContext = (directoryLoading && !hasDirectory) || scopeLoading;

  const handleSelectFile = async (picked) => {

    const outcome = await selectFile(picked);

    if (outcome?.success) {
      toast.success(
        `${outcome.rows.toLocaleString()} rows read from ${picked.name}.`
      );
    }

  };

  const handleValidate = async () => {

    const outcome = await runValidation();

    if (!outcome?.success) {
      toast.error("Could not check this file against your existing attendance.");
    }

  };

  const handleConfirm = async () => {

    setConfirming(false);

    const outcome = await runImport();

    if (!outcome?.success) return;

    setHistoryKey((key) => key + 1);

    if (outcome.status === IMPORT_STATUS.COMPLETED) {
      toast.success(
        `${outcome.imported.toLocaleString()} attendance records imported.`
      );
      return;
    }

    if (outcome.status === IMPORT_STATUS.COMPLETED_WITH_ERRORS) {
      toast.warning(
        "The import finished, but some records could not be written."
      );
      return;
    }

    toast.error("The import failed. No attendance was written.");

  };

  /* The history is worth showing before a file is picked and after a run. */
  const showHistory =
    step === IMPORT_STEP.UPLOAD || step === IMPORT_STEP.COMPLETE;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <AttendancePageHeader
          title="Import Attendance"
          subtitle="Bring historical attendance in from another HR or payroll system."
          icon={<FiUploadCloud />}
        />

        {step !== IMPORT_STEP.UPLOAD && (
          <div className="shrink-0 lg:pt-8">
            <ImportStepper currentStep={step} />
          </div>
        )}

      </div>

      {/* A manager with no departments has nothing they could import for. */}
      {!loadingContext && scope?.isUnassigned && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">You have no departments assigned.</span>{" "}
            Attendance can only be imported for employees in departments you
            manage, so there is nothing you can import yet. Ask your HR team to
            assign your departments.
          </p>
        </div>
      )}

      {loadingContext && (
        <div className="ui-card">
          <LoadingState message="Loading your employee directory..." />
        </div>
      )}

      {!loadingContext && directoryError && (
        <div className="ui-card">
          <ErrorState
            title="Could not load employees"
            message="Attendance rows are matched against the employee directory, so the import cannot start without it."
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      {!loadingContext && !directoryError && (
        <>

          {step === IMPORT_STEP.UPLOAD && (
            <ImportUploadStep
              file={file}
              busy={busy}
              error={error}
              onSelect={handleSelectFile}
              onClear={clearFile}
              onContinue={() => goToStep(IMPORT_STEP.MAP)}
            />
          )}

          {step === IMPORT_STEP.MAP && (
            <ImportMappingStep
              headers={headers}
              mapping={mapping}
              onMapColumn={mapColumn}
              missingRequiredFields={missingRequiredFields}
              dateFormat={dateFormat}
              onDateFormat={setDateFormat}
              dateAmbiguity={dateAmbiguity}
              unknownStatuses={unknownStatuses}
              statusOverrides={statusOverrides}
              onMapStatus={mapStatus}
              canContinue={canLeaveMapping}
              rowCount={rowCount}
              onBack={() => goToStep(IMPORT_STEP.UPLOAD)}
              onContinue={runMatching}
            />
          )}

          {step === IMPORT_STEP.MATCH && (
            <ImportMatchStep
              rows={rows}
              summary={summary}
              busy={busy}
              error={error}
              scope={scope}
              rechecking={rechecking}
              onRecheck={recheckEmployees}
              onBack={() => goToStep(IMPORT_STEP.MAP)}
              onContinue={handleValidate}
            />
          )}

          {step === IMPORT_STEP.VALIDATE && (
            <ImportValidateStep
              rows={rows}
              summary={summary}
              mode={mode}
              onModeChange={changeMode}
              fileName={file?.name}
              onBack={() => goToStep(IMPORT_STEP.MATCH)}
              onContinue={goToPreview}
            />
          )}

          {step === IMPORT_STEP.PREVIEW && (
            <ImportPreviewStep
              rows={rows}
              summary={summary}
              mode={mode}
              onBack={() => goToStep(IMPORT_STEP.VALIDATE)}
              onImport={() => setConfirming(true)}
            />
          )}

          {step === IMPORT_STEP.IMPORTING && (
            <ImportProgressStep
              progress={progress}
              onCancel={cancelImport}
            />
          )}

          {step === IMPORT_STEP.COMPLETE && (
            <ImportCompleteStep
              result={result}
              rows={rows}
              mode={mode}
              fileName={file?.name}
              onImportAnother={reset}
              onViewAttendance={() => navigate("/attendance/monthly")}
            />
          )}

        </>
      )}

      {showHistory && (
        <ImportHistoryPanel
          companyCode={companyCode}
          refreshKey={historyKey}
        />
      )}

      <ImportConfirmModal
        open={confirming}
        summary={summary}
        mode={mode}
        fileName={file?.name || ""}
        onCancel={() => setConfirming(false)}
        onConfirm={handleConfirm}
      />

    </div>
  );

}

export default AttendanceImport;
