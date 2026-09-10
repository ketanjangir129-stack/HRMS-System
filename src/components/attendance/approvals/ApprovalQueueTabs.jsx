import { APPROVAL_STATUS } from "../../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Approval Queue Tabs
|--------------------------------------------------------------------------
| The four views of the same period: what is still waiting, what was signed
| off, what was turned down, and all of it.
|
| Tabs rather than another dropdown beside the department and status filters.
| Which of the four the reviewer is in is the single most important thing on
| the screen - it decides whether the buttons below are a queue to work
| through or a record to read - and a value folded into a select says that
| far too quietly.
|
| Each carries its count, so the queue is legible before it is opened: a
| reviewer can see there are eleven days waiting without first switching to
| the tab that would show them.
|--------------------------------------------------------------------------
*/

const TABS = [
  {
    value: APPROVAL_STATUS.PENDING,
    label: "Pending",
    countKey: "pending",
    activeClass: "border-amber-500 text-amber-700",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  {
    value: APPROVAL_STATUS.APPROVED,
    label: "Approved",
    countKey: "approved",
    activeClass: "border-emerald-500 text-emerald-700",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    value: APPROVAL_STATUS.REJECTED,
    label: "Rejected",
    countKey: "rejected",
    activeClass: "border-red-500 text-red-700",
    badgeClass: "bg-red-50 text-red-700 ring-red-200",
  },
  {
    value: "",
    label: "All Days",
    countKey: "total",
    activeClass: "border-brand text-brand",
    badgeClass: "bg-surface-muted text-ink-muted ring-line",
  },
];

function ApprovalQueueTabs({ value, onChange, summary }) {
  return (
    /*
    | Scrolls sideways on a phone rather than wrapping onto two lines. Four
    | tabs at 360px do not fit, and a second row of them under the first reads
    | as two separate controls.
    */
    <div
      role="tablist"
      aria-label="Approval queue"
      className="ui-scroll flex gap-1 overflow-x-auto border-b border-line px-2 sm:px-4"
    >

      {TABS.map((tab) => {

        const active = value === tab.value;

        const count = summary?.[tab.countKey] || 0;

        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
              active
                ? tab.activeClass
                : "border-transparent text-ink-subtle hover:text-ink"
            }`}
          >

            {tab.label}

            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ring-1 ${
                active
                  ? tab.badgeClass
                  : "bg-surface-muted text-ink-subtle ring-line-subtle"
              }`}
            >
              {count}
            </span>

          </button>
        );

      })}

    </div>
  );
}

export default ApprovalQueueTabs;
