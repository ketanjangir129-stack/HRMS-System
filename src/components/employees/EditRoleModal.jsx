import { useState } from "react";
import { FiAlertCircle, FiInfo, FiShield, FiX } from "react-icons/fi";

import { ROLE } from "../../utils/attendance/attendanceConstants";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "../../utils/permissions/permissionConstants";
import { validateRoleChange } from "../../utils/permissions/roleAssignment";

/*
|--------------------------------------------------------------------------
| Edit Role
|--------------------------------------------------------------------------
| What the portal lets one employee do.
|
| Only the roles the signed in user may hand out are offered, which is the
| whole set for the owner and for HR and manager-or-employee for a manager.
| The list is passed in rather than derived here, so the button that opened
| this modal and the options inside it can never disagree about who may do
| what: both read `roleAssignment`.
|
| Each option carries its description from the permission registry. A role is
| the one field on an employee record whose consequences are not visible from
| its name, so "Manager" is offered with what a manager is rather than on its
| own.
|
| The caller keys this on the employee, so opening a second row remounts it
| and the selection starts from that employee's own role. Resetting it in an
| effect would render the previous row's choice for a frame first, which on a
| dialog about permissions is a frame showing the wrong answer.
|--------------------------------------------------------------------------
*/

function EditRoleModal({
  open,
  employee,
  actorRole = "",
  roles = [],
  saving = false,
  error = "",
  onClose,
  onSave,
}) {

  const currentRole = employee?.role || ROLE.EMPLOYEE;

  const [selected, setSelected] = useState(currentRole);

  const [problem, setProblem] = useState("");

  if (!open || !employee) return null;

  /*
  | A manager losing the role is released from the departments they were
  | running, so the dialog says so before it happens rather than leaving the
  | Departments screen to explain it afterwards.
  */
  const isDemotingManager =
    currentRole === ROLE.MANAGER && selected !== ROLE.MANAGER;

  const isPromotingManager =
    currentRole !== ROLE.MANAGER && selected === ROLE.MANAGER;

  const handleSave = () => {

    const invalid = validateRoleChange({
      actorRole,
      nextRole: selected,
      currentRole,
    });

    if (invalid) {
      setProblem(invalid);
      return;
    }

    onSave(selected);

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      {/* `max-h-[90vh]` keeps the save button reachable on a short
          landscape phone screen. */}
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

        <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 sm:h-11 sm:w-11 sm:text-xl">
              <FiShield />
            </div>

            <div className="min-w-0">

              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Change Role
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                {employee.name || employee.employeeId || "This employee"}
                {employee.employeeId && employee.name
                  ? ` · ${employee.employeeId}`
                  : ""}
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
        | Radio cards rather than a dropdown: there are three options at most,
        | each needs a line of explanation, and the current one has to stay
        | visible while another is being considered.
        */}
        <fieldset className="space-y-2.5" disabled={saving}>

          <legend className="mb-2 text-sm font-medium text-slate-700">
            Role
          </legend>

          {roles.map((role) => {

            const isSelected = selected === role;
            const isCurrent = currentRole === role;

            return (
              <label
                key={role}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 ${
                  isSelected
                    ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-200"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                } ${saving ? "cursor-not-allowed opacity-60" : ""}`}
              >

                <input
                  type="radio"
                  name="employee-role"
                  value={role}
                  checked={isSelected}
                  onChange={() => {
                    setSelected(role);
                    setProblem("");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                />

                <span className="min-w-0">

                  <span className="flex flex-wrap items-center gap-2">

                    <span className="text-sm font-semibold text-slate-900">
                      {ROLE_LABELS[role] || role}
                    </span>

                    {isCurrent && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        Current
                      </span>
                    )}

                  </span>

                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {ROLE_DESCRIPTIONS[role]}
                  </span>

                </span>

              </label>
            );

          })}

        </fieldset>

        {(problem || error) && (

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <FiAlertCircle
              className="mt-0.5 shrink-0 text-red-500"
              size={16}
            />

            <p className="text-xs leading-relaxed text-red-700 sm:text-sm">
              {problem || error}
            </p>

          </div>

        )}

        {isDemotingManager && (

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

            <FiAlertCircle
              className="mt-0.5 shrink-0 text-amber-600"
              size={16}
            />

            <p className="text-xs leading-relaxed text-amber-800">
              They currently run one or more departments. Taking the Manager
              role away releases them from all of it, and those departments
              will have no manager until one is assigned again.
            </p>

          </div>

        )}

        {isPromotingManager && (

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

            <FiInfo className="mt-0.5 shrink-0 text-slate-400" size={16} />

            <p className="text-xs leading-relaxed text-slate-500">
              A manager approves nothing until a department is handed to them.
              Assign them one from the Departments page to give them attendance
              and leave approvals for it.
            </p>

          </div>

        )}

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

          <FiInfo className="mt-0.5 shrink-0 text-slate-400" size={16} />

          <p className="text-xs leading-relaxed text-slate-500">
            The new role takes effect the next time they sign in.
          </p>

        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">

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
            disabled={saving || selected === currentRole}
            className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {saving ? "Saving..." : "Save Role"}
          </button>

        </div>

      </div>

    </div>
  );

}

export default EditRoleModal;
