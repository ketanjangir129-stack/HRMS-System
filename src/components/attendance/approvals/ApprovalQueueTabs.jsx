import { APPROVAL_STATUS } from "../../../utils/attendance/attendanceConstants";
import {
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiXCircle,
} from "react-icons/fi";

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
    icon: FiClock,
    countKey: "pending",
    activeClass: "border-amber-500 text-amber-700",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  {
    value: APPROVAL_STATUS.APPROVED,
    label: "Approved",
    icon: FiCheckCircle,
    countKey: "approved",
    activeClass: "border-emerald-500 text-emerald-700",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    value: APPROVAL_STATUS.REJECTED,
    label: "Rejected",
    icon: FiXCircle,
    countKey: "rejected",
    activeClass: "border-red-500 text-red-700",
    badgeClass: "bg-red-50 text-red-700 ring-red-200",
  },
  {
    value: "",
    label: "All Days",
    icon: FiInbox,
    countKey: "total",
    activeClass: "border-brand text-brand",
    badgeClass: "bg-surface-muted text-ink-muted ring-line",
  },
];

function ApprovalQueueTabs({ value, onChange, summary }) {
  return (
    /*
    | A compact segmented control makes the current queue state obvious before
    | a reviewer scans the table. It scrolls on narrow screens rather than
    | wrapping the four states onto two ambiguous rows.
    */
    <div
      role="tablist"
      aria-label="Approval queue"
      className="ui-scroll flex gap-2 overflow-x-auto border-b border-line bg-surface-muted/40 px-4 py-3 sm:px-6"
    >

      {TABS.map((tab) => {

        const active = value === tab.value;

        const Icon = tab.icon;

        const count = summary?.[tab.countKey] || 0;

        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 ${
              active
                ? `${tab.activeClass} bg-surface shadow-sm`
                : "border-transparent bg-transparent text-ink-subtle hover:border-line hover:bg-surface hover:text-ink"
            }`}
          >

            <Icon size={15} aria-hidden="true" />

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
