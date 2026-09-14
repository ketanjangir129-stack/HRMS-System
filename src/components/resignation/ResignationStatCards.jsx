import {
  CheckCircle2,
  Clock,
  LogOut,
  Wallet,
  XCircle,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Resignation Stat Cards
|--------------------------------------------------------------------------
| Five numbers over the queue.
|
| The middle three split "in progress" into the two halves that are actually
| different jobs: exits still waiting on somebody to decide, and exits that
| are agreed and are being settled. A single "In Progress" figure would put a
| resignation filed this morning in the same bucket as one waiting on finance
| to release the money, and those are not the same problem.
|
| The counts come from `getResignationSummary`, which walks the list once -
| so five cards cost one pass rather than five filters.
|--------------------------------------------------------------------------
*/

const CARDS = [
  {
    key: "total",
    label: "Total",
    hint: "All resignations",
    icon: LogOut,
    accent: "bg-surface-muted text-ink-subtle",
    value: "text-ink",
  },
  {
    key: "awaitingApproval",
    label: "Awaiting Approval",
    hint: "With a manager or HR",
    icon: Clock,
    accent: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
  },
  {
    key: "inSettlement",
    label: "In Settlement",
    hint: "Approved, being closed out",
    icon: Wallet,
    accent: "bg-blue-50 text-blue-600",
    value: "text-blue-700",
  },
  {
    key: "exited",
    label: "Exited",
    hint: "Settled and certified",
    icon: CheckCircle2,
    accent: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
  },
  {
    key: "rejected",
    label: "Rejected",
    hint: "Turned down",
    icon: XCircle,
    accent: "bg-red-50 text-red-600",
    value: "text-red-700",
  },
];

function ResignationStatCards({ summary = {} }) {

  return (

    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">

      {CARDS.map((card) => {

        const Icon = card.icon;

        return (

          <div
            key={card.key}
            /*
            | The Total card spans both columns on the narrowest layout so the
            | grid of five does not leave one card stranded on a row of its
            | own with a gap beside it.
            */
            className={`ui-card p-4 sm:p-5 ${
              card.key === "total" ? "col-span-2 lg:col-span-1" : ""
            }`}
          >

            <div className="flex items-center gap-3">

              <span className={`ui-tile-sm flex ${card.accent}`}>
                <Icon className="h-4 w-4" />
              </span>

              <div className="min-w-0">

                <p className="ui-eyebrow truncate">{card.label}</p>

                <p className={`mt-0.5 text-2xl font-bold ${card.value}`}>
                  {summary[card.key] ?? 0}
                </p>

              </div>

            </div>

            <p className="mt-3 truncate text-xs text-ink-faint">{card.hint}</p>

          </div>

        );

      })}

    </div>

  );

}

export default ResignationStatCards;
