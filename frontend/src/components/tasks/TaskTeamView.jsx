import { FiUsers } from "react-icons/fi";
import { formatDuration, formatTime, personName } from "../../utils/tasks/taskUtils";
import { Avatar } from "./PeopleStack";

/*
|--------------------------------------------------------------------------
| Task Team View
|--------------------------------------------------------------------------
| Manager ke liye "kaun abhi kis par hai". Data server deta hai
| (GET /tasks/team) — Manager ko apna department, HR/Owner ko sab.
|
| Har card: abhi wala task aur step (kab se, kiske saath), aaj aur is hafte
| kitna waqt, aur khule / ruke / overdue / aaj poore. Card dabao to list
| usi insaan ke tasks par khulti hai.
|--------------------------------------------------------------------------
*/

function Stat({ value, label, danger = false }) {
  return (
    <span className="flex flex-col text-[10.5px] font-medium text-ink-faint">
      <b className={`text-base tabular-nums ${danger && value ? "text-red-600" : "text-ink"}`}>{value}</b>
      {label}
    </span>
  );
}

// now page se aata hai (har minute badalta hai) — "for 1h 20m" chalta rahe
function TaskTeamView({ members = [], loading, error, onPick, onRetry, now }) {
  if (loading && !members.length) {
    return (
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-semibold text-ink">Couldn't load the team</p>
        <p className="mt-1 text-sm text-ink-subtle">{error}</p>
        <button type="button" onClick={onRetry} className="ui-btn ui-btn-secondary mt-4">
          Try again
        </button>
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-faint">
          <FiUsers size={24} />
        </span>
        <p className="font-semibold text-ink">No one in your team yet</p>
        <p className="text-sm text-ink-subtle">
          Managers see the departments they manage. Ask HR to set you as a department manager.
        </p>
      </div>
    );
  }

  const working = members.filter((member) => member.working).length;
  const overdue = members.reduce((sum, member) => sum + member.overdue, 0);
  const names = Object.fromEntries(members.map((member) => [member.employeeId, member.name]));

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <p className="text-sm text-ink-subtle">
        <b className="text-ink">{working} of {members.length}</b> working now
        {overdue > 0 && (
          <>
            {" · "}
            <b className="text-red-600">{overdue}</b> overdue in team
          </>
        )}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {members.map((member) => (
          <button
            key={member.employeeId}
            type="button"
            onClick={() => onPick(member.employeeId)}
            title={`Show ${member.name}'s tasks`}
            className="ui-card ui-card-interactive flex cursor-pointer flex-col gap-3 p-4 text-left"
          >
            <span className="flex w-full items-center gap-2.5">
              <Avatar id={member.employeeId} names={names} size="md" live={Boolean(member.working)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{member.name}</span>
                <span className="block truncate text-xs text-ink-faint">{member.department || "—"}</span>
              </span>
              <span
                className={`ui-badge ring-1 ring-inset ${
                  member.working
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-surface-muted text-ink-subtle ring-line"
                }`}
              >
                {member.working ? "Working" : "Idle"}
              </span>
            </span>

            <span className="flex min-h-19 w-full flex-col justify-center gap-0.5 rounded-xl bg-surface-muted px-3 py-2.5">
              {member.working ? (
                <>
                  <span className="ui-eyebrow">Working on</span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                    {member.working.title}
                  </span>
                  {member.working.stepTitle && (
                    <span className="line-clamp-1 text-xs text-ink-subtle">
                      Step: {member.working.stepTitle}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-emerald-700">
                    {member.working.since ? `for ${formatDuration(now - member.working.since)}` : "now"}
                    {member.working.with?.length
                      ? ` · with ${member.working.with.map((id) => personName(id, names)).join(", ")}`
                      : ""}
                  </span>
                </>
              ) : (
                <span className="text-sm text-ink-subtle">
                  {member.open ? "Not working on a task right now" : "No open tasks"}
                </span>
              )}
            </span>

            {/* Waqt — aaj aur is hafte (Somvar se), chalta session samet */}
            <span className="grid w-full grid-cols-2 gap-2 text-sm">
              <span className="flex items-baseline justify-between rounded-lg bg-surface-muted px-2.5 py-1.5">
                <span className="text-xs text-ink-faint">Today</span>
                <b className="tabular-nums text-ink">{formatTime(member.todayMs || 0)}</b>
              </span>
              <span className="flex items-baseline justify-between rounded-lg bg-surface-muted px-2.5 py-1.5">
                <span className="text-xs text-ink-faint">This week</span>
                <b className="tabular-nums text-ink">{formatTime(member.weekMs || 0)}</b>
              </span>
            </span>

            <span className="grid w-full grid-cols-4 gap-1 text-center">
              <Stat value={member.open} label="Open" />
              <Stat value={member.paused} label="Paused" />
              <Stat value={member.overdue} label="Overdue" danger />
              <Stat value={member.doneToday} label="Done today" />
            </span>

            {member.stepsOpen > 0 && (
              <span className="text-xs text-ink-subtle">
                {member.stepsOpen} open step{member.stepsOpen > 1 ? "s" : ""} assigned
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TaskTeamView;
