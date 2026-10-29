import { FiColumns, FiList, FiUsers } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Task Layout Switch
|--------------------------------------------------------------------------
| List / Board / Team — wahi tasks, teen tarah se. Team sirf unhe dikhta
| hai jinke paas tasks.team hai (Manager, HR, Owner).
|--------------------------------------------------------------------------
*/

const LAYOUTS = [
  { key: "list", label: "List", icon: <FiList size={14} /> },
  { key: "board", label: "Board", icon: <FiColumns size={14} /> },
  { key: "team", label: "Team", icon: <FiUsers size={14} /> },
];

function TaskLayoutSwitch({ value, onChange, showTeam = false }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex gap-0.5 rounded-xl bg-surface-raised p-1">
      {LAYOUTS.filter((layout) => layout.key !== "team" || showTeam).map((layout) => {
        const active = layout.key === value;

        return (
          <button
            key={layout.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(layout.key)}
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
              active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-subtle hover:text-ink"
            }`}
          >
            {layout.icon}
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}

export default TaskLayoutSwitch;
