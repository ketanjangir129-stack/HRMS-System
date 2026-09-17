import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  acquireEmployees,
  releaseEmployees,
  restartEmployees,
} from "../store/employeesSlice";

/*
|--------------------------------------------------------------------------
| Employees (shared)
|--------------------------------------------------------------------------
| Company ke employees, store se. Screen aata hai to listener mein hissa
| leta hai, jaata hai to chhod deta hai — download kitne bhi screens ke
| liye ek hi hota hai.
|
|   const { employees, loading, error, reload } = useEmployees(companyCode);
|
| employees Firebase ki shakal mein hai — { EMP001: {...} } — bilkul wahi jo
| getEmployees() deta tha, isliye purana mapping code jaisa ka taisa chalta
| hai.
|
| enabled: false ho to hook kuch nahi karta — na listener, na data. Ye
| zaroori hai: kai screens (Tasks, AllTasks) jaan-boojhkar Employee role ke
| liye poori company ki list download hi nahi karte. Shared hook ki wajah se
| wo rok toot jaaye, aisa nahi hona chahiye.
|
| Data store ka hai aur store use freeze rakhta hai — padhkar naya object
| banao, seedha badlo mat.
|--------------------------------------------------------------------------
*/

// Har render par naya {} dete to useMemo har baar dobara chalta
const EMPTY = Object.freeze({});

const useEmployees = (companyCode, { enabled = true } = {}) => {
  const dispatch = useDispatch();
  const active = Boolean(companyCode) && enabled;

  useEffect(() => {
    if (!active) return;

    dispatch(acquireEmployees(companyCode)); // Listener lagao, store mein data aa jaaye to screen turant dikhaye

    return () => dispatch(releaseEmployees(companyCode)); // Listener hatao, store mein data rahe to bhi screen ko nahi dikhaye
  }, [dispatch, active, companyCode]);

  const state = useSelector((root) => root.employees);  

  // Store mein kisi aur company ka data ho to wo is screen ka nahi
  const matches = active && state.companyCode === companyCode;

  const reload = useCallback(() => {
    if (active) dispatch(restartEmployees(companyCode));
  }, [dispatch, active, companyCode]);

  return {
    employees: matches ? state.data : EMPTY,
    /*
    | Bina company ya enabled: false — loading nahi, jaisa pehle hota tha
    | jab fetch chalti hi nahi thi. Warna pehle render se hi "loading", jab
    | tak store is company ka "ready" na kahe — wahi jo pehle useState(true)
    | se hota tha.
    */
    loading: active && (!matches || state.status === "loading"),
    error: matches && state.status === "error" ? state.error : "",
    reload,
  };
};

export default useEmployees;
