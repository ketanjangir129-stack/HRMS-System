import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addSubtask,
  fetchSubtaskAssignees,
  fetchSubtasks,
  fetchTaskActivity,
  fetchTaskTime,
  removeSubtask,
  setTaskWork,
  subscribeTaskVersion,
  updateSubtask,
} from "../services/taskService";
import { taskActivityList } from "../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| useTaskDetails
|--------------------------------------------------------------------------
| Ek khule hue task ka andar ka saman — steps, activity, time sessions —
| aur unpar kaam. Drawer sirf dikhata hai; padhna-likhna yahan.
|
| Chalta tabhi hai jab koi task khula ho (taskId), aur band hote hi
| listener hat jaata hai — jitne tasks utni history har baar utaarna
| bekaar hai, jab ek waqt par ek hi dikhti hai.
|
| meta/version badle (koi bhi, kahin bhi likhe) to teeno dobara aate hain,
| isliye drawer khula rehte hue teammate ka badlaav apne aap dikhta hai.
|--------------------------------------------------------------------------
*/

/*
| Step ka status turant badalta dikhe (server ka intezaar nahi). Timer bhi
| wahi karta hai jo server karega: chalte waqt ko timeSpent mein jodo aur
| workingBy hatao — warna rukne par ghadi ek pal peeche koodti.
*/
const foldTimer = (step, ids, now) => {
  const workingBy = { ...(step.workingBy || {}) };
  let spent = Number(step.timeSpent) || 0;
  ids.forEach((id) => {
    if (!workingBy[id]) return;
    spent += Math.max(0, now - workingBy[id]);
    delete workingBy[id];
  });
  return { ...step, timeSpent: spent, workingBy: Object.keys(workingBy).length ? workingBy : undefined };
};

const applyStepStatus = (steps, stepId, status, { me, startingMine }) => {
  const now = Date.now();

  return steps.map((step) => {
    if (step.id !== stepId) {
      // Mera timer yahan shuru hua — server baaki jagah ka mera kaam rokta hai
      return startingMine && step.workingBy?.[me] ? foldTimer(step, [me], now) : step;
    }

    const next = {
      ...step,
      status,
      done: status === "Done",
      startedAt: step.startedAt || (status === "In Progress" ? now : undefined),
      doneAt: status === "Done" ? step.doneAt || now : undefined,
    };

    if (status !== "In Progress") return foldTimer(next, Object.keys(step.workingBy || {}), now);
    if (startingMine) return { ...next, workingBy: { ...(step.workingBy || {}), [me]: now } };
    return next;
  });
};

function useTaskDetails(taskId, { companyCode, canViewActivity = true, myEmployeeId } = {}) {
  const [subtasks, setSubtasks] = useState([]);
  const [canAddSubtask, setCanAddSubtask] = useState(false);
  const [activity, setActivity] = useState({});
  const [time, setTime] = useState(null);
  const [people, setPeople] = useState({});
  // Picker ki list kis task ki hai, saath mein — doosra task khule to
  // purani list apne aap bekaar ho jaati hai, effect mein saaf nahi karni padti
  const [assigneeState, setAssigneeState] = useState({ taskId: null, data: null });
  // Kis task ka data aa chuka hai — doosra task khulte hi purana ek pal ke
  // liye bhi na dikhe
  const [loadedFor, setLoadedFor] = useState(null);
  // Steps alag se — wo baaki sab se pehle aa jaate hain
  const [stepsFor, setStepsFor] = useState(null);
  const [error, setError] = useState("");

  const currentId = useRef(taskId);
  /*
  | Step badalte waqt jo padhaai beech mein shuru hui, uske steps purane ho
  | sakte hain — wo turant dikhaya hua badlaav waapas na palat de. Har
  | badlaav ye ginti badhata hai; padhaai shuru aur ant mein ginti alag ho
  | to us jawab ke steps chhod do (baaki sab theek hai).
  */
  const stepWrites = useRef(0);

  useEffect(() => {
    currentId.current = taskId;
  }, [taskId]);

  const load = useCallback(async () => {
    const id = currentId.current;
    if (!id) return;
    const writesAtStart = stepWrites.current;

    /*
    | Steps aate hi dikhao — activity aur time ka intezaar nahi. Wo sirf
    | "Started" ki purani tareekh ke liye hain, aur steps sabse zaroori.
    */
    const stepsRequest = fetchSubtasks(id).then((value) => {
      if (currentId.current !== id) return value;
      if (writesAtStart === stepWrites.current) {
        setSubtasks(value.subtasks);
        setCanAddSubtask(value.canAdd);
      }
      setPeople((previous) => ({ ...previous, ...value.people }));
      setStepsFor(id);
      return value;
    });

    const [steps, history, spent] = await Promise.allSettled([
      stepsRequest,
      canViewActivity ? fetchTaskActivity(id) : Promise.resolve({ activity: {}, people: {} }),
      fetchTaskTime(id),
    ]);

    // Beech mein doosra task khul gaya to ye jawab bekaar hai
    if (currentId.current !== id) return;

    if (history.status === "fulfilled") setActivity(history.value.activity);
    if (spent.status === "fulfilled") setTime(spent.value);

    setPeople((previous) => ({
      ...previous,
      ...(history.status === "fulfilled" ? history.value.people : {}),
      ...(spent.status === "fulfilled" ? spent.value.people : {}),
    }));

    const failed = [steps, history, spent].find((result) => result.status === "rejected");
    setError(failed ? failed.reason?.message || "Some details could not be loaded." : "");
    setLoadedFor(id);
  }, [canViewActivity]);

  useEffect(() => {
    if (!taskId || !companyCode) return undefined;

    return subscribeTaskVersion(companyCode, load);
  }, [taskId, companyCode, load]);

  const loaded = Boolean(taskId) && loadedFor === taskId;
  // Steps ki request fail ho to bhi poora load hone par "aa gaye" maano — warna
  // placeholder hamesha ghoomta rehta
  const stepsLoaded = Boolean(taskId) && (stepsFor === taskId || loaded);

  const activityEntries = useMemo(
    () => (loaded ? taskActivityList(activity) : []),
    [loaded, activity]
  );

  const assignees = assigneeState.taskId === taskId ? assigneeState.data : null;

  // Person picker ki list — sirf jab koi step jodne lage
  const loadAssignees = useCallback(async () => {
    if (!taskId || assignees) return;
    try {
      setAssigneeState({ taskId, data: await fetchSubtaskAssignees(taskId) });
    } catch (loadError) {
      console.error("Failed to load step assignees:", loadError);
      setAssigneeState({ taskId, data: { onTask: [], others: [] } });
    }
  }, [taskId, assignees]);

  // Har kaam ke baad turant dobara padhte hain — version ka ishaara bhi
  // aayega, par apna badlaav bina deri dikhna chahiye
  const run = async (work) => {
    const result = await work();
    await load();
    return result;
  };

  /*
  | Step ka status — pehle screen par, phir server. Server ke baad poora
  | dobara padhna intezaar mein nahi (version ka ishaara bhi wahi karega);
  | galti ho to dobara padh kar asli haal waapas.
  */
  const changeStep = async (step, status, work, { startingMine = false } = {}) => {
    stepWrites.current += 1;
    setSubtasks((previous) => applyStepStatus(previous, step.id, status, { me: myEmployeeId, startingMine }));

    try {
      return await work();
    } finally {
      stepWrites.current += 1;
      load();
    }
  };

  return {
    loaded,
    stepsLoaded,
    error,
    subtasks: stepsLoaded ? subtasks : [],
    canAddSubtask: stepsLoaded && canAddSubtask,
    activityEntries,
    time: loaded ? time : null,
    // Activity bhi chahiye — jin purane tasks ka session nahi, unka andaza wahi se
    activity: loaded ? activity : {},
    people,
    assignees,
    loadAssignees,
    addStep: (step) => run(() => addSubtask(taskId, step)),
    setStepStatus: (step, status) =>
      changeStep(step, status, () => updateSubtask(taskId, step.id, { status })),
    // Step par kaam shuru — pichhla kaam (kahin bhi) server khud band karta hai
    startStep: (step) =>
      changeStep(step, "In Progress", () => setTaskWork({ id: taskId }, "start", step.id), {
        startingMine: Boolean(myEmployeeId),
      }),
    // Naam, person, date, andaza — sirf jo badla wahi jaata hai
    editStep: (step, changes) => run(() => updateSubtask(taskId, step.id, changes)),
    deleteStep: (step) => run(() => removeSubtask(taskId, step.id)),
  };
}

export default useTaskDetails;
