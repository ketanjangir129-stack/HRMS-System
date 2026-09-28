import { ArrowRight, Inbox } from "lucide-react";

import ResignationStatusBadge from "./common/ResignationStatusBadge";

import { formatDate } from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Table
|--------------------------------------------------------------------------
| The queue. A table from `lg` and a list of cards below it — the same
| division the attendance and salary tables make, because six columns on a
| phone is six columns nobody can read.
|
| It carries no buttons of its own. Every decision in this flow needs a modal
| and half of them need a whole screen, so a row opens the record and the
| actions live where the context does. A queue whose rows carry Approve and
| Reject teaches people to decide without reading, and this is not a queue
| where that is acceptable.
|
| `actionLabel` is what the row offers instead, and it changes with whose
| turn it is — "Review", "Prepare Settlement", "Approve" — so a manager and
| an HR user reading the same list are each told what the row wants from
| them.
|--------------------------------------------------------------------------
*/

/* The initials tile, matched to the one the employee directory uses. */
function Avatar({ name, employeeId }) {

  const initials = String(name || employeeId || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
      {initials}
    </span>
  );

}

function EmptyState({ message }) {

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">

      <span className="ui-tile flex bg-surface-muted text-ink-faint">
        <Inbox className="h-6 w-6" />
      </span>

      <p className="text-sm font-semibold text-ink-muted">{message}</p>

    </div>
  );

}

function ResignationTable({
  resignations = [],
  emptyMessage = "No resignations to show.",
  getActionLabel,
  onOpen,
}) {

  if (!resignations.length) {
    return <EmptyState message={emptyMessage} />;
  }

  /* The word this row wants from this reader, or a neutral one. */
  const labelFor = (resignation) =>
    getActionLabel?.(resignation) || "View";

  return (
    <>

      {/* Table — lg and up */}
      <div className="hidden overflow-x-auto lg:block">

        <table className="w-full min-w-[900px] text-left">

          <thead>

            <tr className="border-b border-line bg-surface-muted">

              {[
                "Employee",
                "Department",
                "Designation",
                "Applied On",
                "Last Working Day",
                "Status",
                "",
              ].map((heading, index) => (
                <th
                  key={heading || index}
                  scope="col"
                  className="ui-eyebrow whitespace-nowrap px-5 py-3.5"
                >
                  {heading}
                </th>
              ))}

            </tr>

          </thead>

          <tbody>

            {resignations.map((resignation) => (

              <tr
                key={resignation.resignationId}
                className="border-b border-line-subtle transition-colors last:border-0 hover:bg-surface-muted"
              >

                <td className="px-5 py-4">

                  <div className="flex items-center gap-3">

                    <Avatar
                      name={resignation.name}
                      employeeId={resignation.employeeId}
                    />

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-ink">
                        {resignation.name || "—"}
                      </p>

                      <p className="truncate text-xs text-ink-faint">
                        {resignation.employeeId}
                      </p>

                    </div>

                  </div>

                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-muted">
                  {resignation.department || "—"}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-muted">
                  {resignation.designation || "—"}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-muted">
                  {formatDate(resignation.raisedOn)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-ink">
                  {formatDate(
                    resignation.lastWorkingDay ||
                    resignation.requestedLastWorkingDay
                  )}
                </td>

                <td className="px-5 py-4">
                  <ResignationStatusBadge status={resignation.status} size="sm" />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right">

                  <button
                    type="button"
                    onClick={() => onOpen?.(resignation)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
                  >
                    {labelFor(resignation)}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* Cards — below lg */}
      <div className="divide-y divide-line-subtle lg:hidden">

        {resignations.map((resignation) => (

          <button
            key={resignation.resignationId}
            type="button"
            onClick={() => onOpen?.(resignation)}
            className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left transition-colors hover:bg-surface-muted"
          >

            <div className="flex items-start justify-between gap-3">

              <div className="flex min-w-0 items-center gap-3">

                <Avatar
                  name={resignation.name}
                  employeeId={resignation.employeeId}
                />

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold text-ink">
                    {resignation.name || "—"}
                  </p>

                  <p className="truncate text-xs text-ink-faint">
                    {[resignation.employeeId, resignation.department]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                </div>

              </div>

              <ResignationStatusBadge status={resignation.status} size="sm" />

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">

              <div className="min-w-0">

                <p className="text-[11px] text-ink-faint">Last working day</p>

                <p className="truncate text-sm font-semibold text-ink">
                  {formatDate(
                    resignation.lastWorkingDay ||
                    resignation.requestedLastWorkingDay
                  )}
                </p>

              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand">
                {labelFor(resignation)}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>

            </div>

          </button>

        ))}

      </div>

    </>
  );

}

export default ResignationTable;
