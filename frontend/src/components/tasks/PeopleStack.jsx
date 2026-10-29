import { AVATAR_TONES } from "../../utils/tasks/taskConstants";
import { initialsOf, personName } from "../../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| People Stack
|--------------------------------------------------------------------------
| Task par kaun-kaun hai — ek doosre par chadhe hue gol avatar. Hara dot
| matlab wo insaan abhi is task par kaam kar raha hai.
|
| Rang naam se nikalta hai (hash), isliye ek insaan list, board, drawer —
| har jagah ek hi rang mein dikhta hai.
|--------------------------------------------------------------------------
*/

const toneFor = (id = "") => {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const SIZES = {
  xs: "h-5 w-5 text-[8.5px]",
  sm: "h-7 w-7 text-[10.5px]",
  md: "h-9 w-9 text-xs",
};

export function Avatar({ id, names = {}, size = "sm", live = false }) {
  const name = personName(id, names);

  return (
    <span
      title={live ? `${name} · working now` : name}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-inset ${SIZES[size]} ${toneFor(id)}`}
    >
      {initialsOf(name)}
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
      )}
    </span>
  );
}

function PeopleStack({ ids = [], names = {}, workingIds = [], max = 3, size = "sm" }) {
  const visible = ids.slice(0, max);
  const hidden = ids.length - visible.length;

  if (!ids.length) {
    return <span className="text-sm text-ink-faint">Unassigned</span>;
  }

  return (
    <span className="inline-flex items-center">
      {visible.map((id, index) => (
        <span
          key={id}
          className={`rounded-full ring-2 ring-surface ${index ? "-ml-2" : ""}`}
        >
          <Avatar id={id} names={names} size={size} live={workingIds.includes(id)} />
        </span>
      ))}

      {hidden > 0 && (
        <span
          title={ids.slice(max).map((id) => personName(id, names)).join(", ")}
          className={`-ml-2 inline-flex items-center justify-center rounded-full bg-surface-raised font-bold text-ink-subtle ring-2 ring-surface ${SIZES[size]}`}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}

export default PeopleStack;
