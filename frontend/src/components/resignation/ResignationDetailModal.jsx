import {
  Building2,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileText,
  IdCard,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { useEffect } from "react";

import ResignationStatusBadge from "./common/ResignationStatusBadge";
import ResignationTracker from "./ResignationTracker";
import EquipmentChecklist from "./EquipmentChecklist";

import {
  formatDate,
  formatDateTime,
} from "../../utils/resignation/resignationUtils";

import { formatCurrency } from "../../utils/salary/formatCurrency";

/*
|--------------------------------------------------------------------------
| Resignation Detail
|--------------------------------------------------------------------------
| One resignation, in full: who filed it, why, where it has got to, what was
| decided at each step and — once they exist — the equipment declaration and
| the settlement.
|
| It is the same modal for everybody who can open the record, and it is the
| decisions in the footer that differ. Every section below appears only when
| it has something in it, so an employee looking at a resignation filed an
| hour ago sees the request and the tracker, and the same modal on a settled
| exit is a complete history without either of them being a separate screen.
|
| The actions are handed in rather than decided here. Whose turn it is is
| answered by `resignationUtils` on the page, against the same checks the
| service guards with — so a button that appears is a button that will work.
|--------------------------------------------------------------------------
*/

/* One labelled fact. */
function Fact({ icon: Icon, label, value }) {

  return (
    <div className="flex min-w-0 items-start gap-3">

      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-subtle">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">

        <p className="text-xs font-medium text-ink-faint">{label}</p>

        <p className="mt-0.5 break-words text-sm font-semibold text-ink">
          {value || <span className="font-normal text-ink-faint">—</span>}
        </p>

      </div>

    </div>
  );

}

/* A section heading with a rule under it, repeated enough to be worth one. */
function Section({ title, children, action }) {

  return (
    <section>

      <div className="mb-3 flex items-center justify-between gap-3">

        <h3 className="ui-eyebrow">{title}</h3>

        {action}

      </div>

      {children}

    </section>
  );

}

/*
| One decision in the trail. The remark is the part that matters — a
| rejection without its reason is just a red word — so it is printed in full
| rather than truncated.
*/
function TrailEntry({ stamp, title, tone = "neutral" }) {

  if (!stamp) return null;

  const approved = tone === "approve";

  const rejected = tone === "reject";

  const Icon = rejected ? XCircle : CheckCircle2;

  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">

      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          rejected
            ? "bg-red-100 text-red-600"
            : approved
              ? "bg-emerald-100 text-emerald-600"
              : "bg-blue-100 text-blue-600"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">

          <p className="text-sm font-semibold text-ink">{title}</p>

          <p className="text-xs text-ink-faint">{formatDateTime(stamp.at)}</p>

        </div>

        <p className="mt-0.5 text-xs text-ink-subtle">
          by {stamp.byName || stamp.by || "—"}
        </p>

        {stamp.remarks && (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-muted">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <span className="break-words">{stamp.remarks}</span>
          </p>
        )}

      </div>

    </div>
  );

}

function DetailView({ resignation, actions = null, onClose }) {

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [onClose]);

  const totals = resignation?.fnf?.totals;

  return (

    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">

              <h2 className="ui-card-title truncate">
                {resignation?.name || resignation?.employeeId}
              </h2>

              <ResignationStatusBadge status={resignation?.status} size="sm" />

            </div>

            <p className="ui-card-subtitle mt-0.5 truncate">
              Resignation filed {formatDate(resignation?.raisedOn)}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-icon-btn shrink-0"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Body */}
        <div className="hide-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">

          {/* Progress */}
          <div className="rounded-2xl border border-line bg-surface-muted p-4 sm:p-5">
            <ResignationTracker status={resignation?.status} />
          </div>

          {/* Employee */}
          <Section title="Employee Details">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <Fact icon={UserRound} label="Name" value={resignation?.name} />

              <Fact icon={IdCard} label="Employee ID" value={resignation?.employeeId} />

              <Fact icon={Building2} label="Department" value={resignation?.department} />

              <Fact icon={Briefcase} label="Designation" value={resignation?.designation} />

              <Fact icon={Phone} label="Mobile" value={resignation?.mobile} />

              <Fact icon={Mail} label="Email" value={resignation?.email} />

            </div>

          </Section>

          {/* The request */}
          <Section title="Resignation">

            <div className="space-y-4 rounded-2xl border border-line p-4 sm:p-5">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                <Fact
                  icon={CalendarDays}
                  label="Requested Last Day"
                  value={formatDate(resignation?.requestedLastWorkingDay)}
                />

                <Fact
                  icon={CalendarDays}
                  label="Confirmed Last Day"
                  value={
                    resignation?.lastWorkingDay
                      ? formatDate(resignation.lastWorkingDay)
                      : "Not confirmed yet"
                  }
                />

                <Fact
                  icon={FileText}
                  label="Reason"
                  value={resignation?.reasonCategory}
                />

              </div>

              {resignation?.reason && (
                <div className="border-t border-line-subtle pt-4">

                  <p className="text-xs font-medium text-ink-faint">
                    In their words
                  </p>

                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-ink-muted">
                    {resignation.reason}
                  </p>

                </div>
              )}

              {resignation?.documentUrl && (
                <div className="border-t border-line-subtle pt-4">

                  <a
                    href={resignation.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View attached document
                  </a>

                </div>
              )}

            </div>

          </Section>

          {/* Decision trail — only the steps that have actually happened */}
          {(resignation?.managerReview ||
            resignation?.hrReview ||
            resignation?.fnfReturn ||
            resignation?.fnfReview ||
            resignation?.financeApproval) && (

            <Section title="Decisions">

              <div className="space-y-2.5">

                <TrailEntry
                  stamp={resignation.managerReview}
                  title={`Manager ${resignation.managerReview?.decision || ""}`}
                  tone={
                    resignation.managerReview?.decision === "Rejected"
                      ? "reject"
                      : "approve"
                  }
                />

                <TrailEntry
                  stamp={resignation.hrReview}
                  title={`HR ${resignation.hrReview?.decision || ""}`}
                  tone={
                    resignation.hrReview?.decision === "Rejected"
                      ? "reject"
                      : "approve"
                  }
                />

                <TrailEntry
                  stamp={resignation.fnfReturn}
                  title="Settlement Returned for Correction"
                  tone="neutral"
                />

                <TrailEntry
                  stamp={resignation.fnfReview}
                  title="Settlement Reviewed"
                  tone="approve"
                />

                <TrailEntry
                  stamp={resignation.financeApproval}
                  title="Finance Approved"
                  tone="approve"
                />

              </div>

            </Section>

          )}

          {/* Equipment, once declared */}
          {resignation?.equipmentSubmittedAt && (

            <Section title="Equipment Declared">

              <EquipmentChecklist
                items={resignation.equipment}
                readOnly
              />

              {resignation.equipmentRemarks && (
                <p className="mt-3 rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                  <span className="text-ink-faint">Employee's note: </span>
                  {resignation.equipmentRemarks}
                </p>
              )}

            </Section>

          )}

          {/* Settlement, once priced */}
          {totals && (

            <Section title="Full & Final Settlement">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                  <p className="ui-eyebrow">Earnings</p>

                  <p className="mt-1 text-lg font-bold text-emerald-700">
                    {formatCurrency(totals.totalEarnings)}
                  </p>

                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

                  <p className="ui-eyebrow">Deductions</p>

                  <p className="mt-1 text-lg font-bold text-red-700">
                    {formatCurrency(totals.totalDeductions)}
                  </p>

                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    totals.isRecoverable
                      ? "border-amber-200 bg-amber-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >

                  <p className="ui-eyebrow">
                    {totals.isRecoverable ? "Recoverable" : "Net Payable"}
                  </p>

                  <p
                    className={`mt-1 flex items-center gap-1.5 text-lg font-bold ${
                      totals.isRecoverable ? "text-amber-800" : "text-blue-800"
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                    {formatCurrency(Math.abs(totals.netPayable))}
                  </p>

                </div>

              </div>

              {resignation.fnf?.notes && (
                <p className="mt-3 rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                  <span className="text-ink-faint">Notes: </span>
                  {resignation.fnf.notes}
                </p>
              )}

            </Section>

          )}

        </div>

        {/* Footer — whatever this reader may do with this record */}
        {actions && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
            {actions}
          </div>
        )}

      </div>

    </div>

  );

}

function ResignationDetailModal({ open, resignation, ...props }) {

  if (!open || !resignation) return null;

  return <DetailView resignation={resignation} {...props} />;

}

export default ResignationDetailModal;
