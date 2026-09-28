import { useEffect, useRef } from "react";

import {
  sweepTaskDueNotifications,
} from "../services/notifications/taskNotificationService";

import { todayInputValue } from "../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| Task Due / Overdue Sweep
|--------------------------------------------------------------------------
| Ye hook koi data nahi deta — sirf ek kaam ek baar chalata hai.
|
| Due aur overdue ki khabar koi bhejta nahi, waqt guzarne se banti hai, aur
| is project mein koi server ya cron hai nahi. Isliye jo list pehle se khuli
| padi hai, wahi ye kaam karti hai: task screen khulte hi ek pass.
|
| Listener realtime hai — ek update par tasks state naya object ban jaata
| hai — isliye effect baar-baar chalta. Ref us par lagaam hai: ek session
| mein ek company, ek din ka ek hi sweep. Firebase ka nishaan (marker) uske
| bahar bhi rakhwali karta hai: refresh, doosra tab, doosra user — teenon
| soorat mein wahi khabar dobara nahi jaati.
|
| Khaali list par kuch nahi hota, isliye pehle render (jab tasks abhi aayi
| hi nahi) sweep ko "ho chuka" nahi maan leta.
|
| Sweep khud har task ki galti andar hi sambhaal leta hai, isliye yahan
| sirf aakhri jaal — na toast, na error state. Ye kaam user ne maanga hi
| nahi tha, to uske saamne fail bhi nahi hona chahiye.
|--------------------------------------------------------------------------
*/

function useTaskDueNotifications(companyCode, tasks) {

  const sweptRef = useRef("");

  useEffect(() => {

    if (!companyCode || !tasks?.length) return;

    const today = todayInputValue();

    const key = `${companyCode}/${today}`;

    if (sweptRef.current === key) return;

    sweptRef.current = key;

    sweepTaskDueNotifications(companyCode, tasks, today).catch((error) => {
      console.error("Task due notification sweep failed:", error);
    });

  }, [companyCode, tasks]);

}

export default useTaskDueNotifications;
