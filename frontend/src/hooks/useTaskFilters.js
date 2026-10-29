import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ALL_STATUSES } from "../utils/tasks/taskConstants";

/*
|--------------------------------------------------------------------------
| useTaskFilters
|--------------------------------------------------------------------------
| Tasks page ke saare filter URL mein — /tasks?view=overdue&person=EMP01.
| Pehle ye page ki state mein the, aur refresh karte hi sab hat jaata tha.
| Ab refresh, back button aur bheja hua link — teeno wahi list kholte hain.
|
| Default value URL mein nahi likhte, isliye saadi list ka URL saada
| /tasks hi rehta hai.
|--------------------------------------------------------------------------
*/

// filter ka naam → URL ka chhota naam
const KEYS = {
  layout: "layout",
  view: "view",
  card: "card",
  search: "q",
  status: "status",
  priority: "priority",
  assignee: "person",
  due: "due",
  sort: "sort",
};

const defaultsFor = (defaultView) => ({
  layout: "list",
  view: defaultView,
  card: "",
  search: "",
  status: ALL_STATUSES,
  priority: "",
  assignee: "",
  due: "",
  sort: "due",
});

// View badalne par ye saaf nahi hote — sirf list ke andar ke filter hote hain
const FILTER_FIELDS = ["card", "search", "status", "priority", "assignee", "due"];

function useTaskFilters(defaultView = "all") {
  const [params, setParams] = useSearchParams();
  const defaults = useMemo(() => defaultsFor(defaultView), [defaultView]);

  const filters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(KEYS).map(([field, key]) => [field, params.get(key) ?? defaults[field]])
      ),
    [params, defaults]
  );

  const setFilters = useCallback(
    (changes) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(changes).forEach(([field, value]) => {
            const key = KEYS[field];
            if (!key) return;
            if (value === undefined || value === null || value === defaults[field] || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });
          return next;
        },
        // Har akshar par history mein naya entry nahi chahiye
        { replace: true }
      ),
    [setParams, defaults]
  );

  const setFilter = useCallback((field, value) => setFilters({ [field]: value }), [setFilters]);

  const clearFilters = useCallback(
    () => setFilters(Object.fromEntries(FILTER_FIELDS.map((field) => [field, defaults[field]]))),
    [setFilters, defaults]
  );

  return { filters, setFilter, setFilters, clearFilters };
}

export default useTaskFilters;
