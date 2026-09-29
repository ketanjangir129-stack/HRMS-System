import { FiAlertCircle, FiBriefcase } from "react-icons/fi";

import useManagerScope from "../../hooks/useManagerScope";

/*
|--------------------------------------------------------------------------
| Department Scope Notice
|--------------------------------------------------------------------------
| The banner a narrowed screen shows above its table.
|
| A manager opening the approval queue sees a shorter list than HR does on the
| same screen, and nothing on the page would otherwise say why. Without this
| line a department of eight inside a company of ninety reads as a page that
| failed to load half its rows, and a manager with no department at all reads
| as a broken queue rather than a setup step nobody has finished.
|
| It also has to be said rather than implied, because the count beside it is
| the thing being explained: "Approve All (3)" is correct and reassuring under
| a banner naming the department, and alarming without one.
|
| Renders nothing for an owner, for HR and for an employee, so a page drops it
| in unconditionally instead of wrapping it in a role check of its own.
|--------------------------------------------------------------------------
*/

function DepartmentScopeNotice({ subject = "records" }) {

  const {
    isScoped,
    isUnassigned,
    departments,
    scopeLabel,
    loading,
    error,
  } = useManagerScope();

  /*
  | Nothing is said while the departments are still being read. The banner
  | would otherwise flash "no departments assigned" on every load, which is
  | the one message on it that reads as a problem.
  */
  if (!isScoped || loading) return null;

  /*
  | A scope that could not be read and a scope that is genuinely empty look
  | the same on screen - an empty queue - so they are told apart here. One is
  | a setup step for the owner, the other is a failed read worth retrying.
  */
  if (error) {

    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 sm:px-6 sm:py-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
          <FiAlertCircle />
        </div>

        <div className="min-w-0">

          <p className="text-sm font-semibold text-red-900">
            Your departments could not be loaded
          </p>

          <p className="mt-0.5 text-xs text-red-700">
            {error} Nothing is shown until they can be read again.
          </p>

        </div>

      </div>
    );

  }

  if (isUnassigned) {

    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 sm:px-6 sm:py-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
          <FiAlertCircle />
        </div>

        <div className="min-w-0">

          <p className="text-sm font-semibold text-amber-900">
            No department has been assigned to you yet
          </p>

          <p className="mt-0.5 text-xs text-amber-700">
            A manager reviews the departments they run. Ask the account owner
            to assign one from the Departments page.
          </p>

        </div>

      </div>
    );

  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">

      <div className="flex min-w-0 items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <FiBriefcase />
        </div>

        <div className="min-w-0">

          <p className="text-sm font-semibold text-blue-900">
            Showing {subject} for your {departments.length === 1
              ? "department"
              : "departments"}
          </p>

          <p className="mt-0.5 text-xs text-blue-700">
            Your own {subject} are reviewed by HR.
          </p>

        </div>

      </div>

      {/*
      | The names themselves, as chips. `pl-13` on a phone lines them up under
      | the text rather than under the icon, the same offset the holiday
      | banner uses for its badge.
      */}
      <div className="flex flex-wrap gap-1.5 pl-13 sm:shrink-0 sm:justify-end sm:pl-0">

        {departments.length <= 3 ? (

          departments.map((department) => (
            <span
              key={department.id}
              className="max-w-[12rem] truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
            >
              {department.name}
            </span>
          ))

        ) : (

          <span
            title={departments.map((department) => department.name).join(", ")}
            className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
          >
            {scopeLabel}
          </span>

        )}

      </div>

    </div>
  );

}

export default DepartmentScopeNotice;
