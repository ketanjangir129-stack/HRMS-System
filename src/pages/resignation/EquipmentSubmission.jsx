import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";

import { useResignation } from "../../hooks/useResignations";

import Loader from "../../components/common/Loader";
import NoAccess from "../../components/common/NoAccess";
import EquipmentChecklist from "../../components/resignation/EquipmentChecklist";
import ResignationTracker from "../../components/resignation/ResignationTracker";

import { submitEquipment } from "../../services/resignation/resignationService";

import {
  EQUIPMENT_ITEMS,
  EQUIPMENT_STATUS,
} from "../../utils/resignation/resignationConstants";

import {
  canSubmitEquipment,
  canViewResignation,
  formatDate,
  getEmptyEquipment,
  hasErrors,
  validateEquipment,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Equipment Submission
|--------------------------------------------------------------------------
| The form HR's approval email links to.
|
| It is behind the normal sign-in rather than a token in the address. The
| employee still has their account at this point — this is the step before
| they leave, not after — so the credentials they already use are a better
| proof of who they are than a link that anybody forwarded the email could
| open.
|
| The page is deliberately strict about who may submit: only the employee the
| resignation belongs to, and only while it is actually waiting on them. HR
| opening the same address sees the declaration read-only, which is what they
| want from it anyway.
|
| Everything a person needs to answer the form is on it — the last working
| day, what the company thinks it issued, and what happens after they submit.
| The alternative is a checklist with no context, filled in from memory.
|--------------------------------------------------------------------------
*/

function EquipmentSubmission() {

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
    actor,
  } = useResignation(resignationId);

  /*
  | The employee's answers, or null until they have touched the form.
  |
  | Null rather than a blank map on purpose. The record arrives a moment after
  | the first render, so state seeded with `getEmptyEquipment()` would have to
  | be overwritten from an effect once it does - and an effect that writes
  | state on every load of the record is both a cascading render and a race
  | with whatever the user has already typed.
  |
  | Deriving it instead means the form reads from the record until there is
  | something of the user's to read from, and there is no moment where the two
  | disagree.
  */
  const [draft, setDraft] = useState(null);

  const items =
    draft ?? { ...getEmptyEquipment(), ...(resignation?.equipment || {}) };

  const [remarks, setRemarks] = useState("");

  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (next) => {

    setDraft(next);

    /*
    | Errors are recomputed rather than cleared wholesale, so fixing one row
    | does not silently clear the complaint about another.
    */
    setErrors((current) =>
      Object.keys(current).length ? validateEquipment(next) : current
    );

  };

  const handleSubmit = async () => {

    const validationErrors = validateEquipment(items);

    if (hasErrors(validationErrors)) {

      setErrors(validationErrors);

      toast.error("Please answer every item before submitting.");

      return;

    }

    setSubmitting(true);

    try {

      const result = await submitEquipment(
        companyCode,
        resignationId,
        actor,
        { items, remarks: remarks.trim() }
      );

      if (!result.success) {
        toast.error(result.message || "The form could not be submitted.");
        return;
      }

      toast.success("Thank you — your equipment declaration has been recorded.");

      reload();

      navigate("/resignation");

    } catch (submitError) {

      console.error("Failed to submit the equipment form:", submitError);

      toast.error("The form could not be submitted. Please try again.");

    } finally {

      setSubmitting(false);

    }

  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="ui-card px-6 py-10">
          <Loader text="Loading the equipment form..." />
        </div>
      </div>
    );
  }

  if (error || !resignation) {
    return (
      <NoAccess
        title="This equipment form could not be opened"
        message={error || "The resignation it belongs to no longer exists."}
        fallbackPath="/resignation"
      />
    );
  }

  /*
  | Entitlement is decided here rather than by the route, because the route
  | only knows the permission and this also depends on whose record it is.
  | The same check every other screen in the module uses.
  */
  if (!canViewResignation(resignation, { role, employeeId, scope })) {
    return (
      <NoAccess
        title="This is not your equipment form"
        message="You can only open the equipment declaration for your own resignation."
        fallbackPath="/resignation"
      />
    );
  }

  const editable = canSubmitEquipment(resignation, employeeId);

  const alreadySubmitted = Boolean(resignation.equipmentSubmittedAt);

  return (

    <div className="space-y-5 p-2">

      {/* Header */}
      <div className="ui-card flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={() => navigate("/resignation")}
            aria-label="Back"
            className="ui-icon-btn shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <span className="ui-tile hidden bg-blue-50 text-brand sm:flex">
            <Package className="h-5 w-5" />
          </span>

          <div className="min-w-0">

            <h1 className="text-xl font-bold text-ink">
              Equipment Submission Form
            </h1>

            <p className="mt-0.5 text-sm text-ink-subtle">
              Declare the company equipment you hold before you leave.
            </p>

          </div>

        </div>

        {resignation.lastWorkingDay && (
          <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-4 py-2.5">

            <CalendarDays className="h-4 w-4 shrink-0 text-ink-subtle" />

            <div>

              <p className="text-[11px] text-ink-faint">Last working day</p>

              <p className="text-sm font-bold text-ink">
                {formatDate(resignation.lastWorkingDay)}
              </p>

            </div>

          </div>
        )}

      </div>

      <div className="ui-card p-5 sm:p-6">
        <ResignationTracker status={resignation.status} />
      </div>

      {/* Employee details, already filled — the same summary the resignation
          form showed, so the two read as one document. */}
      <div className="ui-card overflow-hidden">

        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="ui-card-title">Employee Details</h2>
          <p className="ui-card-subtitle">From your employee record.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">

          {[
            { label: "Name", value: resignation.name },
            { label: "Employee ID", value: resignation.employeeId },
            { label: "Department", value: resignation.department },
            { label: "Designation", value: resignation.designation },
          ].map((field) => (

            <div key={field.label} className="min-w-0">

              <p className="text-xs font-medium text-ink-faint">
                {field.label}
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {field.value || "—"}
              </p>

            </div>

          ))}

        </div>

      </div>

      {/* Already done */}
      {alreadySubmitted && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">

          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="min-w-0">

            <p className="text-sm font-bold text-emerald-900">
              This declaration has already been submitted
            </p>

            <p className="mt-0.5 text-sm text-emerald-800">
              It was recorded on{" "}
              {new Date(resignation.equipmentSubmittedAt).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short", year: "numeric" }
              )}
              . Contact HR if anything below needs correcting.
            </p>

          </div>

        </div>
      )}

      {/* Not yours to fill in, and not yet filled in by them either */}
      {!editable && !alreadySubmitted && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div className="min-w-0">

            <p className="text-sm font-bold text-amber-900">
              This form is not open for submission
            </p>

            <p className="mt-0.5 text-sm text-amber-800">
              Only the employee resigning can complete it, and only once HR has
              approved the resignation.
            </p>

          </div>

        </div>
      )}

      {/* The checklist */}
      <div className="ui-card overflow-hidden">

        <div className="border-b border-line px-5 py-4 sm:px-6">

          <h2 className="ui-card-title">Company Equipment</h2>

          <p className="ui-card-subtitle">
            {editable
              ? `Account for all ${EQUIPMENT_ITEMS.length} items, including anything you were never issued.`
              : "What was declared."}
          </p>

        </div>

        <div className="p-5 sm:p-6">

          <EquipmentChecklist
            items={items}
            errors={errors}
            readOnly={!editable}
            onChange={handleChange}
          />

          {editable && (

            <div className="mt-5">

              <label className="ui-label" htmlFor="equipment-remarks">
                Anything else{" "}
                <span className="font-normal text-ink-faint">(optional)</span>
              </label>

              <textarea
                id="equipment-remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Other company property you hold, who you handed items to, or anything HR should know..."
                className="ui-field resize-none"
              />

            </div>

          )}

          {!editable && resignation.equipmentRemarks && (
            <p className="mt-5 rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
              <span className="text-ink-faint">Employee's note: </span>
              {resignation.equipmentRemarks}
            </p>
          )}

        </div>

        {editable && (

          <div className="flex flex-col gap-3 border-t border-line bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            {/*
            | Said at the point of submitting rather than only at the top:
            | anything marked "Yet to Return" becomes an Asset Recovery line,
            | and that is worth knowing before pressing the button, not after.
            */}
            <p className="flex items-start gap-2 text-xs text-ink-subtle sm:max-w-md">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
              Items marked "{EQUIPMENT_STATUS.PENDING}" may be recovered from
              your full & final settlement. You cannot edit this once submitted.
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="ui-btn ui-btn-primary shrink-0 font-semibold"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting…" : "Submit Declaration"}
            </button>

          </div>

        )}

      </div>

    </div>

  );

}

export default EquipmentSubmission;
