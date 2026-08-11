import { ACTIVITY_TYPES } from "../../services/taskService";
import { STATUS_DOTS } from "../../utils/tasks/taskConstants";
import { activityLabel, formatTimestamp } from "../../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| Task Activity
|--------------------------------------------------------------------------
| Task ke saath kya-kya hua, naya sabse upar. Details modal ke andar ek
| section hai — apna page ya modal nahi, kyunki ye task ki hi jaankari hai.
|
| Firebase se khud baat nahi karta: entries task ke andar aati hain aur
| task modal ko page ki state se milta hai. Isliye modal khula rehte hue
| koi status badle to nayi line apne aap upar aa jaati hai.
|
| Dikhne wala text yahan nahi banta — activityLabel() se aata hai, taaki
| wording ek hi jagah rahe.
|--------------------------------------------------------------------------
*/

/*
| Dot ka rang wahi jo us status ke badge ka hai — timeline aur pill ek hi
| bhasha bolte hain. Created ke liye koi status hai hi nahi, isliye saada
| slate.
*/
const dotClass = (entry) => {
  if (entry.type === ACTIVITY_TYPES.STATUS_CHANGED) {
    return STATUS_DOTS[entry.toStatus] || "bg-slate-400";
  }

  return "bg-slate-400";
};

function TaskActivity({ entries = [] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Activity
      </p>

      {entries.length === 0 ? (
        /*
        | Purane tasks mein activity node hai hi nahi (aur unka koi
        | migration nahi hua) — unke liye yahi soft line dikhti hai,
        | bilkul waise jaise description na hone par dikhti hai.
        */
        <p className="mt-1.5 text-sm italic text-slate-400">No activity yet.</p>
      ) : (
        /*
        | Baayein ek patli lakeer, uspar har entry ka dot — lakeer border se
        | banti hai, isliye list chhoti ho ya lambi, khud hi utni lambi
        | rehti hai.
        */
        <ol className="mt-3 space-y-4 border-l border-slate-200 pl-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              {/*
                ring-white isliye ki dot lakeer ko kaat kar uske upar
                baithe, warna dono ek doosre mein ghul jaate hain
              */}
              <span
                className={`absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dotClass(
                  entry
                )}`}
              />

              <p className="truncate text-sm font-semibold text-slate-800">
                {entry.actorName || "Unknown"}
              </p>

              <p className="text-sm text-slate-600">{activityLabel(entry)}</p>

              <p className="mt-0.5 text-xs text-slate-400">
                {formatTimestamp(entry.timestamp)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default TaskActivity;
