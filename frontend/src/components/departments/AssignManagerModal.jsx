import { useState } from "react";
import { FiAlertCircle, FiInfo, FiUserCheck, FiX } from "react-icons/fi";

import SearchableSelect from "../common/SearchableSelect";

/*
|--------------------------------------------------------------------------
| Assign Manager
|--------------------------------------------------------------------------
| Who runs a department.
|
| Only employees whose role is Manager are offered. Appointing somebody who
| is not one would write a manager onto the department that no screen would
| ever act on: the approval scope is resolved from the role first and from
| this appointment second, so the two have to be made together.
|
| The picker is the searchable select rather than a native dropdown, the same
| one the reports and salary screens use: a company's manager list is short
| today and is a scroll by the time it is not.
|
| The department is passed in whole so the modal can name it and read the
| manager already on it, which is what turns "Assign" into "Change" and puts
| the Remove button on screen.
|
| The caller keys this on the department, so opening a second card remounts it
| and the selection starts from that department's own manager. Resetting the
| selection in an effect instead would render the previous card's choice for a
| frame before correcting it, which on a "Change Manager" dialog is a frame
| showing the wrong person's name.
|--------------------------------------------------------------------------
*/

function AssignManagerModal({
  open,
  department,
  managers = [],
  saving = false,
  onClose,
  onSave,
  onRemove,
}) {

  const current = department?.manager?.employeeId || "";

  const [selected, setSelected] = useState(current);

  const [error, setError] = useState("");

  if (!open) return null;

  const options = managers.map((manager) => ({
    value: manager.employeeId,
    label: manager.name || manager.employeeId,
    hint: `· ${manager.employeeId}`,
  }));

  const handleSave = () => {

    if (!selected) {
      setError("Select a manager to assign.");
      return;
    }

    const manager = managers.find(
      (item) => item.employeeId === selected
    );

    onSave({
      employeeId: selected,
      name: manager?.name || "",
    });

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      {/* `max-h-[90vh]` keeps the save button reachable on a short
          landscape phone screen. */}
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

        <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 sm:h-11 sm:w-11 sm:text-xl">
              <FiUserCheck />
            </div>

            <div className="min-w-0">

              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {current ? "Change Manager" : "Assign Manager"}
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                {department?.name}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX />
          </button>

        </div>

        {/*
        | A company with no manager yet gets the reason rather than an empty
        | dropdown, and the step that fixes it.
        */}
        {options.length === 0 ? (

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">

            <FiAlertCircle
              className="mt-0.5 shrink-0 text-amber-600"
              size={16}
            />

            <p className="text-xs leading-relaxed text-amber-800 sm:text-sm">
              No employee has the Manager role yet. Set an employee's role to
              Manager on their record first, then assign them here.
            </p>

          </div>

        ) : (

          <>

            <label
              htmlFor="department-manager"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Manager
            </label>

            <SearchableSelect
              id="department-manager"
              options={options}
              value={selected}
              onChange={(value) => {
                setSelected(value);
                setError("");
              }}
              placeholder="Select a manager..."
              searchPlaceholder="Search by name or ID..."
              emptyMessage="No managers found"
              ariaLabel="Select a manager"
              disabled={saving}
              allowClear
              className={`w-full rounded-xl border p-3 text-base text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 sm:text-sm ${
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                  : "border-slate-200 focus:border-blue-400 focus:ring-blue-200"
              }`}
            />

            {error && (
              <p className="mt-2 text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

              <FiInfo className="mt-0.5 shrink-0 text-slate-400" size={16} />

              <p className="text-xs leading-relaxed text-slate-500">
                They will be able to approve daily attendance, attendance
                corrections and leave for everyone in this department. One
                manager can run several departments.
              </p>

            </div>

          </>

        )}

        {/*
        | Remove sits on the left of the row rather than beside Save: it is a
        | third choice and not the alternative to saving, and putting it next
        | to the confirm button is how it gets pressed by mistake.
        */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">

          {current && (
            <button
              type="button"
              onClick={onRemove}
              disabled={saving}
              className="w-full cursor-pointer rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:mr-auto"
            >
              Remove Manager
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || options.length === 0}
            className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {saving ? "Saving..." : "Save"}
          </button>

        </div>

      </div>

    </div>
  );

}

export default AssignManagerModal;
