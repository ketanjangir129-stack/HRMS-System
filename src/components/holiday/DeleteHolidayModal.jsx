import { useEffect } from "react";
import {
  FiAlertTriangle,
  FiLoader,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  formatHolidayDateWithDay,
} from "../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "./common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Delete Holiday
|--------------------------------------------------------------------------
| The confirmation before a holiday is removed.
|
| The generic delete dialog would only be able to name the holiday; this one
| shows the date and the type as well, because removing the wrong day changes
| what attendance counts as an absence and what a leave range is charged for.
| That consequence is stated rather than left to be remembered.
|
| The deleting state is owned by the page, not by the dialog: the page is what
| calls the service and knows when it has finished.
|--------------------------------------------------------------------------
*/

function DeleteHolidayModal({
  open,
  holiday,
  onConfirm,
  onClose,
  deleting = false,
}) {

  useEffect(() => {

    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);

  }, [open, deleting, onClose]);

  if (!open || !holiday) return null;

  return (

    <div
      onClick={() => !deleting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4"
    >

      <div
        onClick={(event) => event.stopPropagation()}
        className="hide-scrollbar max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >

        {/* Header */}

        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg text-red-600 sm:h-11 sm:w-11 sm:text-xl">
              <FiAlertTriangle />
            </div>

            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Delete Holiday
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            title="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX />
          </button>

        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          Are you sure you want to remove this holiday from the calendar?
        </p>

        {/* The holiday being removed */}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">

          {/*
          | The badge drops under the holiday on a phone: a type and an
          | optional pill beside the name leaves neither enough width to be
          | read, and this is the dialog where the wrong day must not be
          | mistaken for the right one.
          */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">

            <div className="min-w-0">

              <p className="truncate text-sm font-bold text-slate-900">
                {holiday.name}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {formatHolidayDateWithDay(holiday.date)}
              </p>

            </div>

            <span className="shrink-0">
              <HolidayTypeBadge
                type={holiday.type}
                isOptional={holiday.isOptional}
                size="sm"
              />
            </span>

          </div>

        </div>

        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          Attendance and leave will stop treating this day as a holiday. This
          action cannot be undone.
        </p>

        {/* Actions */}

        {/*
        | Stacked on a phone with the destructive action on top, which is the
        | order `flex-col-reverse` gives the same markup that reads Cancel
        | then Delete on a wide screen.
        */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto"
          >

            {deleting ? (
              <FiLoader className="animate-spin text-[15px]" />
            ) : (
              <FiTrash2 className="text-[15px]" />
            )}

            {deleting ? "Deleting..." : "Delete Holiday"}

          </button>

        </div>

      </div>

    </div>

  );

}

export default DeleteHolidayModal;
