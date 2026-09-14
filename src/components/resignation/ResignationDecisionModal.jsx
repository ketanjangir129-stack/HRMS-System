import { useEffect, useState } from "react";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import {
  daysBetween,
  formatDate,
  getToday,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Decision
|--------------------------------------------------------------------------
| One modal for every decision in the flow, because they are all the same
| shape: somebody confirms a hand-off and says something about it.
|
| What changes between them is whether the note is required and whether a
| date has to be settled, and both are props rather than separate components.
| Four near-identical modals is how a "Reason" that is mandatory in one place
| quietly becomes optional in another.
|
| A rejection always demands a reason and the button stays disabled until
| there is one. That is not politeness: the reason is the only thing the
| employee is told about why their resignation was turned down, and an empty
| one leaves them with a refusal and nowhere to go with it.
|
| HR's approval is the one that carries a date. The employee proposed a last
| working day and this is where it is confirmed or moved - it is the date the
| settlement is priced against and the certificate is printed with, so it is
| settled by a person rather than inherited silently from the request.
|--------------------------------------------------------------------------
*/

const TONE = {
  approve: {
    icon: CheckCircle2,
    tile: "bg-emerald-50 text-emerald-600",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  reject: {
    icon: XCircle,
    tile: "bg-red-50 text-red-600",
    button: "bg-red-600 text-white hover:bg-red-700",
  },
  neutral: {
    icon: CheckCircle2,
    tile: "bg-blue-50 text-brand",
    button: "ui-btn-primary",
  },
};

function DecisionForm({
  title,
  description,
  resignation,
  tone = "neutral",
  confirmLabel = "Confirm",
  noteLabel = "Remarks",
  notePlaceholder = "Add a note (optional)...",
  noteRequired = false,
  /* Shows the last working day field — HR's approval step only. */
  withLastWorkingDay = false,
  onClose,
  onConfirm,
  submitting = false,
}) {

  const [note, setNote] = useState("");

  const [lastWorkingDay, setLastWorkingDay] = useState(
    resignation?.lastWorkingDay ||
    resignation?.requestedLastWorkingDay ||
    ""
  );

  const [error, setError] = useState("");

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [submitting, onClose]);

  const style = TONE[tone] || TONE.neutral;

  const Icon = style.icon;

  const noteMissing = noteRequired && !note.trim();

  /*
  | What the confirmed date amounts to in notice served, recalculated as HR
  | moves it. Moving the date is how a notice shortfall is created or removed,
  | and the person doing it should see that happen rather than discover it on
  | the settlement screen afterwards.
  */
  const noticeServed =
    withLastWorkingDay && lastWorkingDay && resignation?.raisedOn
      ? daysBetween(resignation.raisedOn, lastWorkingDay)
      : 0;

  const required = Number(resignation?.noticePeriodDays) || 0;

  const shortfall = Math.max(0, required - noticeServed);

  const handleConfirm = async () => {

    setError("");

    if (noteMissing) {
      setError(`${noteLabel} is required.`);
      return;
    }

    if (withLastWorkingDay && !lastWorkingDay) {
      setError("Confirm the last working day.");
      return;
    }

    const result = await onConfirm({
      note: note.trim(),
      lastWorkingDay,
    });

    if (result && !result.success) {
      setError(result.message || "That could not be completed.");
    }

  };

  return (

    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className={`ui-tile-sm flex ${style.tile}`}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <h2 className="ui-card-title">{title}</h2>

              {description && (
                <p className="ui-card-subtitle">{description}</p>
              )}

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="ui-icon-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Body */}
        <div className="hide-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">

          {/* Who this is about. Named on every decision, because an approval
              queue is a list of rows that look alike and the cost of deciding
              the wrong one here is somebody's job. */}
          {resignation && (

            <div className="rounded-xl border border-line bg-surface-muted px-4 py-3">

              <p className="text-sm font-bold text-ink">
                {resignation.name || resignation.employeeId}
              </p>

              <p className="mt-0.5 text-xs text-ink-subtle">
                {[
                  resignation.employeeId,
                  resignation.designation,
                  resignation.department,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              {resignation.requestedLastWorkingDay && (
                <p className="mt-2 text-xs text-ink-subtle">
                  Requested last working day:{" "}
                  <span className="font-semibold text-ink-muted">
                    {formatDate(resignation.requestedLastWorkingDay)}
                  </span>
                </p>
              )}

            </div>

          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {withLastWorkingDay && (

            <div>

              <label className="ui-label" htmlFor="confirm-lwd">
                Confirm Last Working Day <span className="text-red-500">*</span>
              </label>

              <input
                id="confirm-lwd"
                type="date"
                value={lastWorkingDay}
                min={getToday()}
                onChange={(e) => {
                  setLastWorkingDay(e.target.value);
                  setError("");
                }}
                className="ui-field cursor-pointer"
              />

              {lastWorkingDay && required > 0 && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    shortfall > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {noticeServed} of {required} days' notice
                  {shortfall > 0
                    ? ` · ${shortfall} day${
                        shortfall === 1 ? "" : "s"
                      } short, recoverable in the settlement`
                    : " · notice period met"}
                </p>
              )}

              <p className="mt-2 flex items-start gap-2 text-xs text-ink-faint">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This is the date the settlement is calculated against and the
                date printed on the exit certificate.
              </p>

            </div>

          )}

          <div>

            <label className="ui-label" htmlFor="decision-note">
              {noteLabel}{" "}
              {noteRequired ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="font-normal text-ink-faint">(optional)</span>
              )}
            </label>

            <textarea
              id="decision-note"
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              placeholder={notePlaceholder}
              className="ui-field resize-none"
            />

            {noteRequired && (
              <p className="mt-1.5 text-xs text-ink-faint">
                This is shown to the employee, so please be specific.
              </p>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">

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
            onClick={handleConfirm}
            disabled={submitting || noteMissing}
            className={`ui-btn font-semibold ${style.button} disabled:opacity-60`}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Working…" : confirmLabel}
          </button>

        </div>

      </div>

    </div>

  );

}

function ResignationDecisionModal({ open, ...props }) {

  if (!open) return null;

  return <DecisionForm {...props} />;

}

export default ResignationDecisionModal;
