import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Building2,
  Briefcase,
  FileText,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  Paperclip,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import {
  ACCEPTED_DOCUMENT_LABEL,
  DEFAULT_NOTICE_PERIOD_DAYS,
  MIN_REASON_LENGTH,
  RESIGNATION_REASONS,
} from "../../utils/resignation/resignationConstants";

import {
  daysBetween,
  formatDate,
  getDocumentError,
  getSuggestedLastWorkingDay,
  getToday,
  hasErrors,
  validateResignation,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Form
|--------------------------------------------------------------------------
| What an employee fills in to give notice.
|
| The top half is their own record, read only. It is shown rather than
| assumed because a resignation is a formal document and the person signing
| it should see what it is going to say about them - and because a wrong
| department here is what sends the whole thing to the wrong manager, so it
| is worth their noticing before they submit rather than after.
|
| Those fields are not editable and are not inputs. Making them editable
| would let somebody route their resignation past their own manager by
| typing a different department into it, and correcting a real mistake
| belongs on the profile where it is checked for uniqueness.
|
| The bottom half is the three things only they can supply: why, when, and
| optionally a letter. The notice period is worked out live from the date
| they pick, because "30 days" means nothing until it is set against the day
| they actually chose.
|--------------------------------------------------------------------------
*/

/* One read-only line of the employee summary. */
function DetailRow({ icon: Icon, label, value }) {

  return (
    <div className="flex min-w-0 items-start gap-3">

      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-subtle">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">

        <p className="text-xs font-medium text-ink-faint">{label}</p>

        <p className="mt-0.5 truncate text-sm font-semibold text-ink">
          {value || <span className="font-normal text-ink-faint">Not on record</span>}
        </p>

      </div>

    </div>
  );

}

function ResignationForm({ employee, onClose, onSubmit, submitting = false }) {

  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState(
    getSuggestedLastWorkingDay(DEFAULT_NOTICE_PERIOD_DAYS)
  );
  const [document, setDocument] = useState(null);
  const [errors, setErrors] = useState({});

  /*
  | Cleared on submit so a failed attempt does not leave a stale banner over
  | a form the user has since corrected.
  */
  const [actionError, setActionError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [submitting, onClose]);

  /*
  | Read on every render rather than held in state, so a form left open
  | across midnight moves its floor with the day - the same reason
  | `ApplyLeaveModal` re-reads its minimum date.
  */
  const today = getToday();

  /*
  | What the chosen date actually amounts to. A shortfall is not an error and
  | does not block the form: leaving on short notice is a normal thing that
  | the settlement prices as a recovery. Saying so here means nobody is
  | surprised by a Notice Recovery line weeks later.
  */
  const noticeServed = lastWorkingDay
    ? daysBetween(today, lastWorkingDay)
    : 0;

  const shortfall = Math.max(0, DEFAULT_NOTICE_PERIOD_DAYS - noticeServed);

  const handleFieldChange = (setter, field) => (value) => {

    setter(value);

    /* The error on the field being corrected goes as it is corrected. */
    setErrors((prev) => ({ ...prev, [field]: "" }));

  };

  const handleDocumentChange = (event) => {

    const file = event.target.files?.[0] || null;

    if (!file) {
      setDocument(null);
      setErrors((prev) => ({ ...prev, document: "" }));
      return;
    }

    const documentError = getDocumentError(file);

    setDocument(file);

    setErrors((prev) => ({ ...prev, document: documentError }));

  };

  const clearDocument = () => {

    setDocument(null);

    setErrors((prev) => ({ ...prev, document: "" }));

    /*
    | The input is reset as well as the state. Without this, choosing the same
    | file again fires no change event - the value has not changed - and the
    | attachment silently fails to come back.
    */
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

  };

  const handleSubmit = async () => {

    setActionError("");

    const validationErrors = validateResignation({
      reasonCategory,
      reason,
      lastWorkingDay,
    });

    const documentError = getDocumentError(document);

    if (documentError) {
      validationErrors.document = documentError;
    }

    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const result = await onSubmit({
      reasonCategory,
      reason: reason.trim(),
      lastWorkingDay,
      noticePeriodDays: DEFAULT_NOTICE_PERIOD_DAYS,
      document,
    });

    /*
    | The modal stays open on a refusal so the typed reason is not lost. The
    | one case it closes itself on is success, which the page handles.
    */
    if (result && !result.success) {
      setActionError(result.message || "The resignation could not be submitted.");
    }

  };

  return (

    /* A sheet off the bottom edge on a phone, a centred dialog from `sm` -
       the same frame `ApplyLeaveModal` uses, with the header and the submit
       pinned while the form scrolls between them. */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="ui-tile-sm flex items-center justify-center bg-red-50 text-red-600">
              <LogOut className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <h2 className="ui-card-title">Resignation Form</h2>

              <p className="ui-card-subtitle truncate">
                Submit your notice for approval.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Body */}
        <div className="hide-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:space-y-7 sm:p-6 lg:p-8">

          {actionError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {actionError}
            </div>
          )}

          {/* Employee details, already filled */}
          <section>

            <div className="mb-3 flex items-center justify-between gap-3">

              <label className="ui-eyebrow">Your Details</label>

              <span className="text-[11px] font-medium text-ink-faint">
                From your employee record
              </span>

            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface-muted p-4 sm:grid-cols-2 sm:p-5">

              <DetailRow icon={UserRound} label="Employee Name" value={employee?.name} />

              <DetailRow icon={IdCard} label="Employee ID" value={employee?.employeeId} />

              <DetailRow icon={Building2} label="Department" value={employee?.department} />

              <DetailRow icon={Briefcase} label="Designation" value={employee?.designation} />

              <DetailRow icon={Phone} label="Mobile Number" value={employee?.mobile} />

              <DetailRow icon={Mail} label="Email" value={employee?.email} />

            </div>

            {/*
            | The department decides which manager this lands with, so a blank
            | one is worth stopping on. The form still submits - the service
            | falls back to HR when a department has no manager - but somebody
            | whose record is incomplete should hear it from here rather than
            | wonder why nothing moved.
            */}
            {!employee?.department && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                No department is set on your record, so this will go straight to
                HR for approval.
              </p>
            )}

          </section>

          {/* Reason */}
          <section className="space-y-4">

            <div>

              <label className="ui-label" htmlFor="reason-category">
                Reason for Resignation <span className="text-red-500">*</span>
              </label>

              <select
                id="reason-category"
                value={reasonCategory}
                onChange={(e) =>
                  handleFieldChange(setReasonCategory, "reasonCategory")(e.target.value)
                }
                className={`ui-field cursor-pointer ${
                  errors.reasonCategory ? "border-red-400" : ""
                }`}
              >

                <option value="">Select a reason</option>

                {RESIGNATION_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}

              </select>

              {errors.reasonCategory && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.reasonCategory}
                </p>
              )}

            </div>

            <div>

              <label className="ui-label" htmlFor="reason">
                Tell us more <span className="text-red-500">*</span>
              </label>

              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(e) =>
                  handleFieldChange(setReason, "reason")(e.target.value)
                }
                placeholder="Describe your reason for leaving..."
                className={`ui-field resize-none ${
                  errors.reason ? "border-red-400" : ""
                }`}
              />

              <div className="mt-1.5 flex items-center justify-between gap-3">

                <p className="text-xs text-ink-faint">
                  At least {MIN_REASON_LENGTH} characters
                </p>

                <p className="text-xs text-ink-faint">
                  {reason.trim().length} entered
                </p>

              </div>

              {errors.reason && (
                <p className="text-xs font-medium text-red-500">{errors.reason}</p>
              )}

            </div>

          </section>

          {/* Last working day */}
          <section>

            <label className="ui-label" htmlFor="last-working-day">
              Intended Last Working Day <span className="text-red-500">*</span>
            </label>

            <input
              id="last-working-day"
              type="date"
              value={lastWorkingDay}
              min={today}
              onChange={(e) =>
                handleFieldChange(setLastWorkingDay, "lastWorkingDay")(e.target.value)
              }
              className={`ui-field cursor-pointer ${
                errors.lastWorkingDay ? "border-red-400" : ""
              }`}
            />

            {errors.lastWorkingDay && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.lastWorkingDay}
              </p>
            )}

            {lastWorkingDay && !errors.lastWorkingDay && (

              <div
                className={`mt-3 rounded-xl border px-4 py-3 ${
                  shortfall > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >

                <p
                  className={`text-sm font-semibold ${
                    shortfall > 0 ? "text-amber-800" : "text-emerald-800"
                  }`}
                >
                  {noticeServed} day{noticeServed === 1 ? "" : "s"} of notice ·
                  last day {formatDate(lastWorkingDay)}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    shortfall > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {shortfall > 0
                    ? `This is ${shortfall} day${
                        shortfall === 1 ? "" : "s"
                      } short of the ${DEFAULT_NOTICE_PERIOD_DAYS} day notice period. The shortfall may be recovered from your final settlement.`
                    : `This meets the ${DEFAULT_NOTICE_PERIOD_DAYS} day notice period. HR may confirm or adjust this date on approval.`}
                </p>

              </div>

            )}

          </section>

          {/* Supporting document */}
          <section>

            <label className="ui-label">
              Supporting Document{" "}
              <span className="font-normal text-ink-faint">(optional)</span>
            </label>

            {document ? (

              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">

                <span className="flex min-w-0 items-center gap-2.5">

                  <FileText className="h-4 w-4 shrink-0 text-brand" />

                  <span className="min-w-0">

                    <span className="block truncate text-sm font-semibold text-ink">
                      {document.name}
                    </span>

                    <span className="block text-xs text-ink-faint">
                      {(document.size / 1024).toFixed(0)} KB
                    </span>

                  </span>

                </span>

                <button
                  type="button"
                  onClick={clearDocument}
                  aria-label="Remove document"
                  className="ui-icon-btn shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

            ) : (

              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors hover:border-brand hover:bg-surface-muted ${
                  errors.document ? "border-red-400" : "border-line"
                }`}
              >

                <Paperclip className="h-5 w-5 text-ink-faint" />

                <span className="text-sm font-semibold text-ink-muted">
                  Attach a resignation letter
                </span>

                <span className="text-xs text-ink-faint">
                  {ACCEPTED_DOCUMENT_LABEL}
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentChange}
                  className="hidden"
                />

              </label>

            )}

            {errors.document && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.document}
              </p>
            )}

          </section>

          {/*
          | The last thing read before the button. A resignation is not a form
          | somebody should be able to submit without having been told it goes
          | to a person and starts a process.
          */}
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-muted px-4 py-3 text-xs text-ink-subtle">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            Once submitted, this goes to your department manager for approval
            and then to HR. You will be asked to return company equipment before
            your settlement is worked out.
          </p>

        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-5 lg:px-8">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ui-btn ui-btn-secondary font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="ui-btn font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Resignation"}
          </button>

        </div>

      </div>

    </div>

  );

}

/*
| The form only exists while the modal is open, so every resignation starts
| from a clean slate rather than the fields a cancelled one was left with.
*/

function ResignationModal({ open, ...props }) {

  if (!open) return null;

  return <ResignationForm {...props} />;

}

export default ResignationModal;
