import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  acquireDepartments,
  releaseDepartments,
  restartDepartments,
} from "../store/departmentsSlice";

/*
|--------------------------------------------------------------------------
| Departments (shared)
|--------------------------------------------------------------------------
| Company ke departments, store se. useEmployees jaisa hi — screen aata hai
| to listener mein hissa leta hai, jaata hai to chhod deta hai.
|
|   const { departments, loading, error, reload } = useDepartments(companyCode);
|
| departments Firebase ki shakal mein hai — { departmentId: {...} } — bilkul
| wahi jo getDepartments() / subscribeDepartments() deta tha.
|
| Data store ka hai aur store use freeze rakhta hai — padhkar naya object
| banao, seedha badlo mat.
|--------------------------------------------------------------------------
*/

// Har render par naya {} dete to useMemo har baar dobara chalta
const EMPTY = Object.freeze({});

const useDepartments = (companyCode, { enabled = true } = {}) => {
  const dispatch = useDispatch();
  const active = Boolean(companyCode) && enabled;

  useEffect(() => {
    if (!active) return;

    dispatch(acquireDepartments(companyCode));

    return () => dispatch(releaseDepartments(companyCode));
  }, [dispatch, active, companyCode]);

  const state = useSelector((root) => root.departments);

  // Store mein kisi aur company ka data ho to wo is screen ka nahi
  const matches = active && state.companyCode === companyCode;

  const reload = useCallback(() => {
    if (active) dispatch(restartDepartments(companyCode));
  }, [dispatch, active, companyCode]);

  return {
    departments: matches ? state.data : EMPTY,
    loading: active && (!matches || state.status === "loading"),
    error: matches && state.status === "error" ? state.error : "",
    reload,
  };
};

export default useDepartments;
