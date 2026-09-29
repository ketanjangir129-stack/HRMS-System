import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  ArrowLeft,
  Loader2,
  Mail,
  Save,
  SendHorizontal,
  ShieldCheck,
  Undo2,
  Wallet,
} from "lucide-react";

import { useResignation } from "../../hooks/useResignations";

import Loader from "../../components/common/Loader";
import NoAccess from "../../components/common/NoAccess";
import FnFWorksheet from "../../components/resignation/FnFWorksheet";
import EquipmentChecklist from "../../components/resignation/EquipmentChecklist";
import ResignationTracker from "../../components/resignation/ResignationTracker";
import ResignationStatusBadge from "../../components/resignation/common/ResignationStatusBadge";
import ResignationDecisionModal from "../../components/resignation/ResignationDecisionModal";

import {
  approveFinanceAndExit,
  resendEquipmentEmail,
  returnFnF,
  reviewFnF,
  saveFnF,
  submitFnFForReview,
} from "../../services/resignation/resignationService";

import { getSalary } from "../../services/SalaryService";

import {
  buildInitialFnF,
  calculateFnF,
  getNoticeShortfall,
} from "../../utils/resignation/fnfCalculator";

import {
  RESIGNATION_STATUS,
} from "../../utils/resignation/resignationConstants";

import {
  canApproveFinance,
  canPrepareFnF,
  canReviewFnF,
  canViewResignation,
  formatDate,
  hasErrors,
  toDateKey,
  validateFnF,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Full & Final Settlement
|--------------------------------------------------------------------------
| The last three stages of an exit on one screen, because they are three
| readings of the same worksheet rather than three different jobs:
|
|   HR prepares it   the fields are editable, and can be saved as a draft
|   HR reviews it    the same figures, read only, with Send to Finance
|   Finance signs    the same figures again, with Approve & Complete Exit
|
| Splitting them into three pages would mean three copies of the worksheet
| and three chances for what one person signed to differ from what another
| one saw. What changes between them is only which buttons are in the footer,
| and that is decided by the same checks the service guards each write with.
|
| The salary structure is read for one purpose: to derive the salary payable
| up to the last working day. It is read once, when the worksheet is first
| built, and never again — a structure revised while HR is mid-settlement
| must not silently move a figure somebody is part way through checking.
|--------------------------------------------------------------------------
*/

function FnFSettlement() {

  const { resignationId } = useParams();

  const navigate = useNavigate();

  const {
    resignation,
    loading,
    error,
    reload,
    companyCode,
    role,
    employeeId,
    scope,
    canFinanceApprove,
    actor,
  } = useResignation(resignationId);

  const [values, setValues] = useState({});

  const [notes, setNotes] = useState("");

  const [derivation, setDerivation] = useState(null);

  const [errors, setErrors] = useState({});

  const [busy, setBusy] = useState("");

  /* `{ type }` — which confirmation modal is open, if any. */
  const [decision, setDecision] = useState(null);

  const [ready, setReady] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Building The Worksheet
  |--------------------------------------------------------------------------
  | A settlement that has already been priced is loaded as it was left. One
  | that has not is derived from the salary structure.
  |
  | `ready` guards the difference. Without it the derived worksheet would be
  | built on the first render — before the record has arrived — and would
  | overwrite a saved draft a moment later with a fresh set of zeroes.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    let cancelled = false;

    const build = async () => {

      if (!resignation || ready) return;

      if (resignation.fnf?.values) {

        if (cancelled) return;

        setValues(resignation.fnf.values);
        setNotes(resignation.fnf.notes || "");
        setDerivation(resignation.fnf.derivation || null);
        setReady(true);

        return;

      }

      /*
      | No structure on record is a real case and not a failure — somebody who
      | left before one was ever assigned. The worksheet opens at zero and
      | says why, rather than refusing to open.
      */
      let salary = null;

      try {

        salary = await getSalary(companyCode, resignation.employeeId);

      } catch (salaryError) {

        console.error("Could not read the salary structure:", salaryError);

      }

      if (cancelled) return;

      const initial = buildInitialFnF(salary, resignation.lastWorkingDay);

      setValues(initial.values);
      setDerivation(initial.derivation);
      setReady(true);

    };

    build();

    return () => {
      cancelled = true;
    };

  }, [resignation, companyCode, ready]);

  const totals = useMemo(() => calculateFnF(values), [values]);

  const noticeShortfall = useMemo(
    () =>
      resignation
        ? getNoticeShortfall({
            raisedOn: resignation.raisedOn,
            lastWorkingDay: resignation.lastWorkingDay,
            noticePeriodDays: resignation.noticePeriodDays,
          })
        : null,
    [resignation]
  );

  const handleValuesChange = (next) => {

    setValues(next);

    setErrors((current) =>
      Object.keys(current).length ? validateFnF(next) : current
    );

  };

  /* Everything the footer can do, each returning to the same reload. */
  const run = async (label, work) => {

    setBusy(label);

    try {

      const result = await work();

      if (!result?.success) {
        toast.error(result?.message || "That could not be completed.");
        return result;
      }

      setDecision(null);

      reload();

      return result;

    } catch (actionError) {

      console.error("Settlement action failed:", actionError);

      toast.error("That could not be completed. Please try again.");

      return { success: false };

    } finally {

      setBusy("");

    }

  };

  const guardFigures = () => {

    const validationErrors = validateFnF(values);

    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      toast.error("Please correct the highlighted amounts.");
      return false;
    }

    return true;

  };

  const handleSaveDraft = async () => {

    if (!guardFigures()) return;

    const result = await run("save", () =>
      saveFnF(companyCode, resignationId, actor, { values, notes, derivation })
    );

    if (result?.success) toast.success("Draft saved.");

  };

  const handleSubmitForReview = async () => {

    if (!guardFigures()) return;

    const result = await run("submit", () =>
      submitFnFForReview(companyCode, resignationId, actor, {
        values,
        notes,
        derivation,
        totals,
      })
    );

    if (result?.success) toast.success("Settlement sent for review.");

  };

  const handleReview = async ({ note }) =>
    await run("review", async () => {

      const result = await reviewFnF(companyCode, resignationId, actor, {
        remarks: note,
        totals,
      });

      if (result.success) toast.success("Reviewed and sent to finance.");

      return result;

    });

  const handleReturn = async ({ note }) =>
    await run("return", async () => {

      const result = await returnFnF(companyCode, resignationId, actor, note);

      if (result.success) toast.success("Sent back for correction.");

      return result;

    });

  const handleFinanceApprove = async ({ note }) =>
    await run("finance", async () => {

      const result = await approveFinanceAndExit(
        companyCode,
        resignationId,
        actor,
        { remarks: note }
      );

      if (!result.success) return result;

      /*
      | The NOC send is reported separately from the exit. The exit is
      | complete either way — that write has landed — and a failed email is
      | something HR re-sends from the certificate page rather than a reason
      | to think the approval did not go through.
      */
      if (result.email?.success) {
        toast.success(`Exit completed. ${result.email.message}`);
      } else {
        toast.warning(
          `Exit completed, but the certificate could not be emailed. ${
            result.email?.message || ""
          }`
        );
      }

      return result;

    });

  const handleResendEquipment = async () => {

    setBusy("resend");

    try {

      const result = await resendEquipmentEmail(companyCode, resignationId);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "The form could not be re-sent.");
      }

    } finally {

      setBusy("");

    }

  };

  if (loading || (resignation && !ready)) {
    return (
      <div className="p-2">
        <div className="ui-card px-6 py-10">
          <Loader text="Loading the settlement..." />
        </div>
      </div>
    );
  }

  if (error || !resignation) {
    return (
      <NoAccess
        title="This settlement could not be opened"
        message={error || "The resignation it belongs to no longer exists."}
        fallbackPath="/resignation"
      />
    );
  }

  if (!canViewResignation(resignation, { role, employeeId, scope })) {
    return (
      <NoAccess
        title="You cannot open this settlement"
        message="Full & final settlements are visible to HR and the account owner."
        fallbackPath="/resignation"
      />
    );
  }

  const preparing = canPrepareFnF(resignation, role) &&
    resignation.status === RESIGNATION_STATUS.FNF_PENDING;

  const reviewing = canReviewFnF(resignation, role);

  const financing = canApproveFinance(resignation, canFinanceApprove);

  /* The worksheet is editable only while it is being prepared. Once it is
     under review the figures are what somebody is checking. */
  const editable = preparing;

  const awaitingEquipment =
    resignation.status === RESIGNATION_STATUS.EQUIPMENT_PENDING;

  const decisionProps = {
    review: {
      title: "Send to Finance",
      description: "Confirm these figures and pass them on for approval.",
      tone: "approve",
      confirmLabel: "Confirm & Send to Finance",
      noteLabel: "Review Remarks",
      onConfirm: handleReview,
    },
    return: {
      title: "Return for Correction",
      description: "This sends the settlement back to be re-worked.",
      tone: "reject",
      confirmLabel: "Send Back",
      noteLabel: "What needs correcting",
      notePlaceholder: "Explain what should be changed...",
      noteRequired: true,
      onConfirm: handleReturn,
    },
    finance: {
      title: "Approve & Complete Exit",
      description:
        "This releases the settlement, completes the exit and emails the certificate.",
      tone: "approve",
      confirmLabel: "Approve & Complete Exit",
      noteLabel: "Approval Remarks",
      onConfirm: handleFinanceApprove,
    },
  }[decision?.type] || {};

  return (

    <div className="space-y-5 p-2">

      {/* Header */}
      <div className="ui-card flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={() => navigate("/resignation/approvals")}
            aria-label="Back"
            className="ui-icon-btn shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <span className="ui-tile hidden bg-blue-50 text-brand sm:flex">
            <Wallet className="h-5 w-5" />
          </span>

          <div className="min-w-0">

            <h1 className="truncate text-xl font-bold text-ink">
              {resignation.name || resignation.employeeId}
            </h1>

            <p className="mt-0.5 truncate text-sm text-ink-subtle">
              {[
                resignation.employeeId,
                resignation.designation,
                resignation.department,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

          </div>

        </div>

        <ResignationStatusBadge status={resignation.status} />

      </div>

      <div className="ui-card p-5 sm:p-6">
        <ResignationTracker status={resignation.status} />
      </div>

      {/*
      | The equipment step is not done yet. The settlement genuinely cannot be
      | priced without knowing what was returned, so the worksheet is not shown
      | at all — and the one useful action here is nudging the employee.
      */}
      {awaitingEquipment ? (

        <div className="ui-card flex flex-col items-center gap-3 px-6 py-12 text-center">

          <span className="ui-tile flex bg-amber-50 text-amber-600">
            <Mail className="h-6 w-6" />
          </span>

          <h2 className="text-base font-bold text-ink">
            Waiting on the equipment declaration
          </h2>

          <p className="max-w-md text-sm text-ink-subtle">
            The settlement cannot be prepared until{" "}
            {resignation.name || "the employee"} has declared what company
            equipment they hold. The form was emailed to {resignation.email}.
          </p>

          <button
            type="button"
            onClick={handleResendEquipment}
            disabled={busy === "resend"}
            className="ui-btn ui-btn-secondary mt-2 font-semibold"
          >
            {busy === "resend" && <Loader2 className="h-4 w-4 animate-spin" />}
            Re-send the Equipment Form
          </button>

        </div>

      ) : (

        <>

          {/* What was returned, as HR prices it */}
          {resignation.equipmentSubmittedAt && (

            <div className="ui-card overflow-hidden">

              <div className="border-b border-line px-5 py-4 sm:px-6">

                <h2 className="ui-card-title">Equipment Declared</h2>

                <p className="ui-card-subtitle">
                  Submitted {formatDate(
                    toDateKey(new Date(resignation.equipmentSubmittedAt))
                  )}
                  . Anything outstanding is usually recovered below.
                </p>

              </div>

              <div className="p-5 sm:p-6">

                <EquipmentChecklist items={resignation.equipment} readOnly />

                {resignation.equipmentRemarks && (
                  <p className="mt-4 rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                    <span className="text-ink-faint">Employee's note: </span>
                    {resignation.equipmentRemarks}
                  </p>
                )}

              </div>

            </div>

          )}

          {/* Anything the reviewer sent back */}
          {resignation.fnfReturn && preparing && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

              <p className="text-sm font-bold text-amber-900">
                This settlement was sent back for correction
              </p>

              <p className="mt-1 text-sm text-amber-800">
                {resignation.fnfReturn.remarks}
              </p>

            </div>
          )}

          {/* The worksheet */}
          <div className="ui-card overflow-hidden">

            <div className="border-b border-line px-5 py-4 sm:px-6">

              <h2 className="ui-card-title">Full & Final Settlement</h2>

              <p className="ui-card-subtitle">
                {editable
                  ? "Work out what is payable and what is being recovered."
                  : "These are the figures as they were submitted."}
              </p>

            </div>

            <div className="p-5 sm:p-6">

              <FnFWorksheet
                resignation={resignation}
                values={values}
                errors={errors}
                notes={notes}
                derivation={derivation}
                noticeShortfall={noticeShortfall}
                readOnly={!editable}
                onChange={handleValuesChange}
                onNotesChange={setNotes}
              />

            </div>

            {/* Whatever this reader may do */}
            {(preparing || reviewing || financing) && (

              <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">

                {preparing && (
                  <>

                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={Boolean(busy)}
                      className="ui-btn ui-btn-secondary font-semibold"
                    >
                      {busy === "save" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Draft
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitForReview}
                      disabled={Boolean(busy)}
                      className="ui-btn ui-btn-primary font-semibold"
                    >
                      {busy === "submit" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                      Submit for Review
                    </button>

                  </>
                )}

                {reviewing && (
                  <>

                    <button
                      type="button"
                      onClick={() => setDecision({ type: "return" })}
                      disabled={Boolean(busy)}
                      className="ui-btn font-semibold border border-amber-200 bg-surface text-amber-700 hover:bg-amber-50"
                    >
                      <Undo2 className="h-4 w-4" />
                      Return for Correction
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision({ type: "review" })}
                      disabled={Boolean(busy)}
                      className="ui-btn font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      Send to Finance
                    </button>

                  </>
                )}

                {financing && (
                  <>

                    <button
                      type="button"
                      onClick={() => setDecision({ type: "return" })}
                      disabled={Boolean(busy)}
                      className="ui-btn font-semibold border border-amber-200 bg-surface text-amber-700 hover:bg-amber-50"
                    >
                      <Undo2 className="h-4 w-4" />
                      Return for Correction
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision({ type: "finance" })}
                      disabled={Boolean(busy)}
                      className="ui-btn font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Approve & Complete Exit
                    </button>

                  </>
                )}

              </div>

            )}

          </div>

        </>

      )}

      <ResignationDecisionModal
        open={Boolean(decision)}
        resignation={resignation}
        submitting={Boolean(busy)}
        onClose={() => setDecision(null)}
        {...decisionProps}
      />

    </div>

  );

}

export default FnFSettlement;
