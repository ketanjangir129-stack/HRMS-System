import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiLoader,
  FiSun,
  FiSunrise,
  FiX,
} from "react-icons/fi";
import {
  HALF_DAY_SESSION,
  HALF_DAY_SESSIONS,
  LEAVE_REQUEST_TYPE,
  LEAVE_REQUEST_TYPES,
} from "../../utils/leave/leaveConstants";
import {
  calculateLeaveDays,
  calculateRemainingBalance,
  formatLeaveDuration,
  getLeaveDaysBreakdown,
  getTodayLeaveDate,
  validateLeaveRequest,
} from "../../utils/leave/leaveUtils";

/*
|--------------------------------------------------------------------------
| Apply Leave
|--------------------------------------------------------------------------
| One modal for all three request types. The date fields change with the
| selected type, so a single day never asks for an end date and a half day
| asks for the session instead.
|
| The duration and the balance preview are recomputed on every keystroke, so
| the employee sees what the request costs before submitting it.
|
| The applied balance is `available`, not `remaining`: days already sitting
| in pending requests are spoken for even though they have not been approved
| yet, and counting them twice would let the balance be overdrawn.
|
| Declared holidays and weekly offs inside the range are not charged, and the
| preview says how many were skipped: a five day range that costs three days
| looks like a bug unless the reason is on screen.
|
| Every date field starts at today. Leave is applied for in advance, so a day
| that has already passed is not offered by the picker at all, and
| `validateLeaveRequest` refuses one that arrives anyway.
|--------------------------------------------------------------------------
*/

const SESSION_ICONS = {
  [HALF_DAY_SESSION.BEFORE_LUNCH]: <FiSunrise />,
  [HALF_DAY_SESSION.AFTER_LUNCH]: <FiSun />,
};

function ApplyLeaveForm({
  onClose,
  balance,
  onSubmit,
  submitting = false,
  holidayDates = [],
}) {

  const [requestType, setRequestType] = useState(LEAVE_REQUEST_TYPE.SINGLE_DAY);
  const [halfDaySession, setHalfDaySession] = useState(HALF_DAY_SESSION.BEFORE_LUNCH);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);

  }, [submitting, onClose]);

  /*
  | The earliest day that may be picked. Read on every render rather than
  | held in state, so a modal left open across midnight moves its floor with
  | the day instead of still offering yesterday.
  */
  const minDate = getTodayLeaveDate();

  const durationType =
    requestType === LEAVE_REQUEST_TYPE.HALF_DAY
      ? LEAVE_REQUEST_TYPE.HALF_DAY
      : "Full Day";

  const leaveDays = calculateLeaveDays({
    requestType,
    fromDate,
    toDate,
    durationType,
    holidayDates,
  });

  /*
  | What the range covers against what it costs, so the days that were left
  | out can be named instead of silently disappearing from the total.
  */
  const breakdown = getLeaveDaysBreakdown({
    requestType,
    fromDate,
    toDate,
    holidayDates,
  });

  const availableBalance = balance?.available ?? 0;

  const remainingBalance = calculateRemainingBalance(
    availableBalance,
    leaveDays
  );

  const isOverdrawn =
    leaveDays > availableBalance;

  /*
  | Switching the type clears the fields the new type does not use, so a
  | leftover end date cannot be submitted with a single day request.
  */

  const handleTypeChange = (value) => {

    setRequestType(value);

    if (value !== LEAVE_REQUEST_TYPE.MULTIPLE_DAY) {
      setToDate("");
    }

  };

  const handleFromDateChange = (value) => {

    setFromDate(value);

    // An end date before the new start date can never be valid.
    if (toDate && toDate < value) {
      setToDate("");
    }

  };

  const handleSubmit = async () => {

    const error = validateLeaveRequest({

      requestType,

      fromDate,

      toDate,

      durationType,

      halfDaySession,

      reason,

      availableBalance,

      holidayDates,

    });

    if (error) {

      toast.error(error);

      return;

    }

    const payload = {

      requestType,

      fromDate,

      toDate:
        requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY
          ? toDate
          : fromDate,

      days: leaveDays,

      halfDaySession:
        requestType === LEAVE_REQUEST_TYPE.HALF_DAY
          ? halfDaySession
          : "",

      reason: reason.trim(),

    };

    await onSubmit(payload);

  };

  return (

    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`.
    | The heading and the submit action are pinned while the form scrolls
    | between them, so "Apply Leave" is reachable without scrolling the whole
    | form back down on a small screen.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
              <FiCalendar size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="ui-card-title">
                Apply Leave
              </h2>

              <p className="ui-card-subtitle truncate">
                Submit a leave request for approval.
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
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}

        <div className="hide-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-7 sm:p-6 lg:p-8">

          {/* Request Type */}

          <div>

            <label className="ui-eyebrow mb-2.5 block sm:mb-3">
              Request Type
            </label>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">

              {LEAVE_REQUEST_TYPES.map((item) => (

                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleTypeChange(item.value)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                    requestType === item.value
                      ? "border-brand bg-blue-50 ring-2 ring-brand-ring"
                      : "border-line hover:border-blue-300 hover:bg-surface-muted"
                  }`}
                >

                  <span
                    className={`block text-sm font-semibold ${
                      requestType === item.value
                        ? "text-blue-700"
                        : "text-ink-muted"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-0.5 block text-xs text-ink-subtle">
                    {item.description}
                  </span>

                </button>

              ))}

            </div>

          </div>

          {/* Dates */}

          {requestType === LEAVE_REQUEST_TYPE.SINGLE_DAY && (

            <div>

              <label className="ui-eyebrow mb-1.5 block">
                Leave Date
              </label>

              <input
                type="date"
                value={fromDate}
                min={minDate}
                onChange={(e) =>
                  handleFromDateChange(e.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-ring"
              />

            </div>

          )}

          {requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY && (

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

              <div>

                <label className="ui-eyebrow mb-1.5 block">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  min={minDate}
                  onChange={(e) =>
                    handleFromDateChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-ring"
                />

              </div>

              <div>

                <label className="ui-eyebrow mb-1.5 block">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || minDate}
                  onChange={(e) =>
                    setToDate(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-ring"
                />

              </div>

            </div>

          )}

          {requestType === LEAVE_REQUEST_TYPE.HALF_DAY && (

            <div className="space-y-4 sm:space-y-5">

              <div>

                <label className="ui-eyebrow mb-1.5 block">
                  Leave Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  min={minDate}
                  onChange={(e) =>
                    handleFromDateChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-ring"
                />

              </div>

              <div>

                <label className="ui-eyebrow mb-2.5 block sm:mb-3">
                  Session
                </label>

                {/* Two across even on a phone: the pair is a choice between
                    the halves of one day, and side by side is how it reads. */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">

                  {HALF_DAY_SESSIONS.map((item) => (

                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setHalfDaySession(item)
                      }
                      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        halfDaySession === item
                          ? "border-brand bg-blue-50 text-blue-700 ring-2 ring-brand-ring"
                          : "border-line text-ink-muted hover:border-blue-300 hover:bg-surface-muted"
                      }`}
                    >

                      {SESSION_ICONS[item]}

                      {item}

                    </button>

                  ))}

                </div>

              </div>

            </div>

          )}

          {/* Duration & Balance */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

            <div className="rounded-2xl border border-line bg-surface-muted p-4 sm:p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-subtle shadow-sm">
                  <FiClock />
                </div>

                <div className="min-w-0">

                  <p className="ui-eyebrow">
                    Leave Duration
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-ink sm:text-xl">
                    {formatLeaveDuration(leaveDays)}
                  </h3>

                </div>

              </div>

              {/*
              | Only shown once something was actually skipped, so a plain
              | range is not cluttered with a line that says "nothing was
              | excluded".
              */}
              {breakdown.skippedDays > 0 && (

                <p className="mt-3 text-xs text-ink-subtle">
                  {breakdown.totalDays} day
                  {breakdown.totalDays === 1 ? "" : "s"} selected ·{" "}
                  {[
                    breakdown.holidayDays.length > 0 &&
                      `${breakdown.holidayDays.length} holiday${
                        breakdown.holidayDays.length === 1 ? "" : "s"
                      }`,
                    breakdown.weeklyOffDays.length > 0 &&
                      `${breakdown.weeklyOffDays.length} weekly off${
                        breakdown.weeklyOffDays.length === 1 ? "" : "s"
                      }`,
                  ]
                    .filter(Boolean)
                    .join(" and ")}{" "}
                  not charged
                </p>

              )}

            </div>

            <div
              className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                isOverdrawn
                  ? "border-red-100 bg-red-50"
                  : "border-blue-100 bg-blue-50"
              }`}
            >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface shadow-sm ${
                    isOverdrawn ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {isOverdrawn ? <FiAlertCircle /> : <FiCalendar />}
                </div>

                <div className="min-w-0">

                  <p className="ui-eyebrow">
                    Remaining Balance
                  </p>

                  <h3
                    className={`mt-1 text-lg font-bold sm:text-xl ${
                      isOverdrawn ? "text-red-700" : "text-blue-700"
                    }`}
                  >
                    {remainingBalance} Days
                  </h3>

                </div>

              </div>

              <p className="mt-3 text-xs text-ink-subtle">
                {isOverdrawn
                  ? `Only ${availableBalance} day(s) available to apply.`
                  : `Remaining after approval · ${availableBalance} available now`}
              </p>

            </div>

          </div>

          {balance?.pending > 0 && (

            <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs font-medium text-amber-700 sm:items-center sm:px-4">
              <FiAlertCircle className="mt-0.5 shrink-0 sm:mt-0" />
              {balance.pending} day(s) are held by requests still awaiting approval.
            </p>

          )}

          {/* Reason */}

          <div>

            <label className="ui-eyebrow mb-1.5 block">
              Reason <span className="text-red-500">*</span>
            </label>

            <textarea
              rows={4}
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              placeholder="Enter leave reason..."
              className="w-full resize-none rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-ring"
            />

            <p className="mt-1.5 text-xs text-ink-faint">
              At least 10 characters · {reason.trim().length} entered
            </p>

          </div>

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
            className="ui-btn ui-btn-primary font-semibold"
          >
            {submitting && <FiLoader className="animate-spin" />}
            {submitting ? "Applying..." : "Apply Leave"}
          </button>

        </div>

      </div>

    </div>

  );

}

/*
| The form only exists while the modal is open, so every application starts
| from a clean slate instead of the fields the previous one was left with.
*/

function ApplyLeaveModal({ open, ...props }) {

  if (!open) return null;

  return <ApplyLeaveForm {...props} />;

}

export default ApplyLeaveModal;
