import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  Inbox,
  LogOut,
  Package,
  ShieldCheck,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import useResignations from "../../hooks/useResignations";

import Loader from "../../components/common/Loader";
import ResignationModal from "../../components/resignation/ResignationModal";
import ResignationTracker from "../../components/resignation/ResignationTracker";
import ResignationStatCards from "../../components/resignation/ResignationStatCards";
import ResignationStatusBadge from "../../components/resignation/common/ResignationStatusBadge";

import { createResignation } from "../../services/resignation/resignationService";
import { getEmployeeById } from "../../services/EmployeeService";

import {
  RESIGNATION_STATUS,
  isRejectedStatus,
} from "../../utils/resignation/resignationConstants";

import {
  formatDate,
  toEmployeeSnapshot,
} from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Dashboard
|--------------------------------------------------------------------------
| The module's landing page, and two quite different screens depending on who
| opens it.
|
| For an employee it is their own exit: the button that starts one, and once
| one exists, the tracker and whatever step is currently theirs. That is the
| whole page for them, and it is the reason this route carries no approval
| permission — everybody can reach their own.
|
| For HR and managers the same page also carries the company's numbers and
| the way through to the queue. It is not a second dashboard: an HR user
| resigns like anybody else and should see their own exit in the same place
| they see everybody else's.
|
| The "what happens next" panel is the part worth the most here. A status pill
| tells somebody where their resignation is; it does not tell them that they
| are the one holding it up. Being explicit about that is what stops an exit
| sitting in EQUIPMENT_PENDING for a fortnight because nobody realised the
| form was waiting on them.
|--------------------------------------------------------------------------
*/

/*
| What the employee is told for each state of their own resignation, and
| where to send them. One map rather than a chain of conditionals in the
| markup, so a state added to the flow is a line here.
|
| `actionPath` is only set for the steps the employee themselves can act on.
| Everything else is a waiting message, and offering a button for a step that
| belongs to somebody else would be a button that does nothing.
*/
const NEXT_STEP = {
  [RESIGNATION_STATUS.MANAGER_PENDING]: {
    icon: ClipboardList,
    title: "Waiting on your manager",
    message:
      "Your department manager has been notified and will review your resignation.",
  },
  [RESIGNATION_STATUS.HR_PENDING]: {
    icon: ClipboardList,
    title: "Waiting on HR",
    message:
      "Your manager has approved. HR will now confirm your last working day.",
  },
  [RESIGNATION_STATUS.EQUIPMENT_PENDING]: {
    icon: Package,
    title: "Return your company equipment",
    message:
      "Your resignation is approved. Please declare the company equipment you hold — your settlement cannot be prepared until you do.",
    actionLabel: "Open Equipment Form",
    actionPath: (id) => `/resignation/equipment/${id}`,
    urgent: true,
  },
  [RESIGNATION_STATUS.FNF_PENDING]: {
    icon: FileCheck2,
    title: "Settlement being prepared",
    message:
      "Thank you. HR is now working out your full & final settlement.",
  },
  [RESIGNATION_STATUS.FNF_REVIEW]: {
    icon: FileCheck2,
    title: "Settlement under review",
    message: "Your settlement has been prepared and is being checked by HR.",
  },
  [RESIGNATION_STATUS.FINANCE_PENDING]: {
    icon: ShieldCheck,
    title: "Waiting on finance approval",
    message:
      "Your settlement has been reviewed and is with finance for final approval.",
  },
  [RESIGNATION_STATUS.EXITED]: {
    icon: FileCheck2,
    title: "Your exit is complete",
    message:
      "Your settlement has been approved and your No Objection Certificate has been issued.",
    actionLabel: "View Certificate",
    actionPath: (id) => `/resignation/noc/${id}`,
  },
};

function ResignationDashboard() {

  const navigate = useNavigate();

  const { currentUser, company } = useAuth();

  const { canAccessSection } = useRoleAccess();

  const {
    mine,
    activeResignation,
    summary,
    awaitingMe,
    resignations,
    loading,
    error,
    reload,
    companyCode,
  } = useResignations();

  const [modalOpen, setModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /*
  | The employee record, re-read rather than taken from `currentUser`.
  |
  | `currentUser` is the snapshot taken at login. HR moving somebody between
  | departments would leave it stale, and the department is what decides which
  | manager the resignation lands with — so a resignation raised from a stale
  | snapshot would go to the wrong person and sit there.
  |
  | A failed read falls back to the snapshot. It is out of date at worst,
  | which is better than a Resign button that cannot be used at all.
  */
  const [record, setRecord] = useState(null);

  const canApply = canAccessSection("resignation.apply");

  const canReview = canAccessSection("resignation.approvals");

  /*
  | The record shown is the one in flight if there is one, and otherwise the
  | most recent. Somebody whose resignation was rejected last month should
  | still find it here rather than an empty page that behaves as though it
  | never happened.
  */
  const latest = activeResignation || mine[0] || null;

  const signedInId =
    currentUser?.employmentInfo?.employeeId ||
    currentUser?.account?.username ||
    "";

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode || !signedInId) return;

      try {

        const data = await getEmployeeById(companyCode, signedInId);

        if (!cancelled && data) setRecord(data);

      } catch (loadError) {

        console.error("Could not re-read the employee record:", loadError);

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, signedInId]);

  const employee = useMemo(
    () => toEmployeeSnapshot(record || currentUser, currentUser),
    [record, currentUser]
  );

  const handleSubmit = async (form) => {

    setSubmitting(true);

    try {

      const result = await createResignation(companyCode, {
        employee,
        ...form,
      });

      if (result.success) {

        setModalOpen(false);

        toast.success("Your resignation has been submitted for approval.");

        reload();

      }

      return result;

    } catch (submitError) {

      console.error("Failed to submit the resignation:", submitError);

      return {
        success: false,
        message: "The resignation could not be submitted. Please try again.",
      };

    } finally {

      setSubmitting(false);

    }

  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="ui-card px-6 py-10">
          <Loader text="Loading your exit details..." />
        </div>
      </div>
    );
  }

  const step = latest ? NEXT_STEP[latest.status] : null;

  const StepIcon = step?.icon || ClipboardList;

  return (

    <div className="space-y-5 p-2">

      {/* Page header */}
      <div className="ui-card flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-center gap-3">

          <span className="ui-tile flex bg-red-50 text-red-600">
            <LogOut className="h-5 w-5" />
          </span>

          <div className="min-w-0">

            <h1 className="text-xl font-bold text-ink">Resignation & Exit</h1>

            <p className="mt-0.5 text-sm text-ink-subtle">
              Give notice, clear your dues and collect your certificate.
            </p>

          </div>

        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">

          {canReview && (
            <Link
              to="/resignation/approvals"
              className="ui-btn ui-btn-secondary font-semibold"
            >
              <Inbox className="h-4 w-4" />
              Approval Queue
              {awaitingMe.length > 0 && (
                <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {awaitingMe.length}
                </span>
              )}
            </Link>
          )}

          {/*
          | Offered only when there is nothing in flight. An employee with a
          | live resignation is given the tracker below instead — a second
          | Resign button would be refused by the service anyway, and offering
          | an action that cannot succeed is worse than not offering it.
          */}
          {canApply && !activeResignation && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ui-btn font-semibold bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Resign
            </button>
          )}

        </div>

      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* The signed in user's own exit */}
      {latest ? (

        <div className="ui-card overflow-hidden">

          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">

              <h2 className="ui-card-title">Your Resignation</h2>

              <p className="ui-card-subtitle">
                Filed {formatDate(latest.raisedOn)} · last working day{" "}
                {formatDate(
                  latest.lastWorkingDay || latest.requestedLastWorkingDay
                )}
              </p>

            </div>

            <ResignationStatusBadge status={latest.status} />

          </div>

          <div className="space-y-5 p-5 sm:p-6">

            <ResignationTracker status={latest.status} />

            {/*
            | A rejection is shown with its reason rather than a next step,
            | because there is no next step — and the reason is the only thing
            | the employee actually needs from this screen.
            */}
            {isRejectedStatus(latest.status) ? (

              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                <p className="text-sm font-bold text-red-900">
                  {latest.status}
                </p>

                {latest.rejectionReason && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-red-800">
                    {latest.rejectionReason}
                  </p>
                )}

                {canApply && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="ui-btn ui-btn-secondary mt-4 font-semibold"
                  >
                    Raise a New Resignation
                  </button>
                )}

              </div>

            ) : step && (

              <div
                className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                  step.urgent
                    ? "border-amber-200 bg-amber-50"
                    : "border-line bg-surface-muted"
                }`}
              >

                <div className="flex min-w-0 items-start gap-3">

                  <span
                    className={`ui-tile-sm flex ${
                      step.urgent
                        ? "bg-amber-100 text-amber-700"
                        : "bg-surface text-ink-subtle"
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">

                    <p
                      className={`text-sm font-bold ${
                        step.urgent ? "text-amber-900" : "text-ink"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p
                      className={`mt-1 text-sm ${
                        step.urgent ? "text-amber-800" : "text-ink-subtle"
                      }`}
                    >
                      {step.message}
                    </p>

                  </div>

                </div>

                {step.actionPath && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(step.actionPath(latest.resignationId))
                    }
                    className={`ui-btn shrink-0 font-semibold ${
                      step.urgent
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "ui-btn-primary"
                    }`}
                  >
                    {step.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

              </div>

            )}

            {/* The confirmed date, once there is one. It is the fact the
                employee will be asked for most often. */}
            {latest.lastWorkingDay && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">

                <CalendarDays className="h-4 w-4 shrink-0 text-ink-subtle" />

                <p className="text-sm text-ink-muted">
                  Your confirmed last working day is{" "}
                  <strong className="text-ink">
                    {formatDate(latest.lastWorkingDay)}
                  </strong>
                  .
                </p>

              </div>
            )}

          </div>

        </div>

      ) : (

        canApply && (

          <div className="ui-card flex flex-col items-center gap-3 px-6 py-12 text-center">

            <span className="ui-tile flex bg-surface-muted text-ink-faint">
              <LogOut className="h-6 w-6" />
            </span>

            <h2 className="text-base font-bold text-ink">
              You have no resignation on record
            </h2>

            <p className="max-w-md text-sm text-ink-subtle">
              If you are leaving {company?.companyName || "the company"}, you
              can give notice here. Your resignation goes to your department
              manager first, then to HR.
            </p>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ui-btn font-semibold bg-red-600 text-white hover:bg-red-700 mt-2"
            >
              <LogOut className="h-4 w-4" />
              Resign
            </button>

          </div>

        )

      )}

      {/*
      | The company view, for the roles that have the queue. Placed under the
      | reader's own exit rather than over it: whatever their role, the thing
      | they came to this page about is more likely to be theirs.
      */}
      {canReview && resignations.length > 0 && (

        <div className="space-y-4">

          <div className="flex items-center justify-between gap-3">

            <h2 className="ui-card-title">Company Exits</h2>

            <Link
              to="/resignation/approvals"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

          </div>

          <ResignationStatCards summary={summary} />

        </div>

      )}

      <ResignationModal
        open={modalOpen}
        employee={employee}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

    </div>

  );

}

export default ResignationDashboard;
