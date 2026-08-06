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

  const durationType =
    requestType === LEAVE_REQUEST_TYPE.HALF_DAY
      ? LEAVE_REQUEST_TYPE.HALF_DAY
      : "Full Day";

  const leaveDays = calculateLeaveDays({
    requestType,
    fromDate,
    toDate,
    durationType,
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

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      <div className="hide-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiCalendar size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="text-xl font-bold text-slate-900">
                Apply Leave
              </h2>

              <p className="mt-0.5 truncate text-sm text-slate-500">
                Submit a leave request for approval.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}

        <div className="space-y-7 p-6 sm:p-8">

          {/* Request Type */}

          <div>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Request Type
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              {LEAVE_REQUEST_TYPES.map((item) => (

                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleTypeChange(item.value)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                    requestType === item.value
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >

                  <span
                    className={`block text-sm font-semibold ${
                      requestType === item.value
                        ? "text-blue-700"
                        : "text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-500">
                    {item.description}
                  </span>

                </button>

              ))}

            </div>

          </div>

          {/* Dates */}

          {requestType === LEAVE_REQUEST_TYPE.SINGLE_DAY && (

            <div>

              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Leave Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  handleFromDateChange(e.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />

            </div>

          )}

          {requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY && (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    handleFromDateChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) =>
                    setToDate(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

          )}

          {requestType === LEAVE_REQUEST_TYPE.HALF_DAY && (

            <div className="space-y-5">

              <div>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Leave Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    handleFromDateChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div>

                <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {HALF_DAY_SESSIONS.map((item) => (

                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setHalfDaySession(item)
                      }
                      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        halfDaySession === item
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                  <FiClock />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leave Duration
                  </p>

                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {formatLeaveDuration(leaveDays)}
                  </h3>

                </div>

              </div>

            </div>

            <div
              className={`rounded-2xl border p-5 transition-colors ${
                isOverdrawn
                  ? "border-red-100 bg-red-50"
                  : "border-blue-100 bg-blue-50"
              }`}
            >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${
                    isOverdrawn ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {isOverdrawn ? <FiAlertCircle /> : <FiCalendar />}
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remaining Balance
                  </p>

                  <h3
                    className={`mt-1 text-xl font-bold ${
                      isOverdrawn ? "text-red-700" : "text-blue-700"
                    }`}
                  >
                    {remainingBalance} Days
                  </h3>

                </div>

              </div>

              <p className="mt-3 text-xs text-slate-500">
                {isOverdrawn
                  ? `Only ${availableBalance} day(s) available to apply.`
                  : `Remaining after approval · ${availableBalance} available now`}
              </p>

            </div>

          </div>

          {balance?.pending > 0 && (

            <p className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              <FiAlertCircle />
              {balance.pending} day(s) are held by requests still awaiting approval.
            </p>

          )}

          {/* Reason */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reason <span className="text-red-500">*</span>
            </label>

            <textarea
              rows={5}
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              placeholder="Enter leave reason..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              At least 10 characters · {reason.trim().length} entered
            </p>

          </div>

        </div>

        {/* Footer */}

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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
