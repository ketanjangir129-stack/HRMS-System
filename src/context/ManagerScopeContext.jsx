import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useAuth from "../hooks/useAuth";
import { getDepartments } from "../services/departmentService";
import {
  getCurrentEmployeeId,
  getUserRole,
} from "../utils/attendance/attendanceRequestUtils";
import {
  buildDepartmentScope,
  canReviewRow,
  describeScope,
  filterDirectoryInScope,
  filterEmployeesInScope,
  filterRowsInScope,
  isManagerRole,
  isRowInScope,
} from "../utils/permissions/departmentScope";

/*
|--------------------------------------------------------------------------
| Manager Scope
|--------------------------------------------------------------------------
| The departments the signed in user runs, loaded once for the session.
|
| This is the companion to `RoleAccessContext` and is shaped like it on
| purpose. That one answers "which screens may this role open", read once from
| `settings/rolesAccess` and shared. This one answers "whose rows may they act
| on", read once from `departments` and shared. A page that narrows a table,
| a summary card and three buttons asks the same object each time rather than
| resolving the departments itself and letting two of them disagree while one
| was still in flight.
|
| Nothing is read for an owner or an HR user. They are never narrowed, so the
| request is skipped entirely and the scope they get is the one every check
| passes through untouched - which also means adding this provider costs the
| roles that were working yesterday exactly one render and no network calls.
|
| Nothing here decides anything either: the answers come from
| `departmentScope`, which the services use as well.
|--------------------------------------------------------------------------
*/

export const ManagerScopeContext = createContext();

export const ManagerScopeProvider = ({ children }) => {

  const { company, currentUser, loading: authLoading } = useAuth();

  const companyCode = company?.companyCode;

  const role = getUserRole(currentUser);

  const employeeId = getCurrentEmployeeId(currentUser);

  const scoped = isManagerRole(role);

  const [departments, setDepartments] = useState({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Load
  |--------------------------------------------------------------------------
  | The read waits for authentication, because the role it is conditional on
  | and the company code it needs both come from it.
  |
  | A failed read is not treated as "manages everything". It is treated as
  | "manages nothing", which is the opposite of how `RoleAccessContext` falls
  | back and is deliberate: a permission that cannot be read should not take
  | away navigation that worked yesterday, but a scope that cannot be read must
  | not hand somebody the whole company's approvals. The error is published
  | alongside it so the screen can say why the queue is empty and offer a
  | retry rather than looking like nobody has anything pending.
  */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (authLoading) {
        setLoading(true);
        return;
      }

      /*
      | Owner, HR and employees are never narrowed, so there is nothing to
      | fetch. The departments tree is not small and this would otherwise be a
      | read on every session for a value none of them ever consults.
      */
      if (!companyCode || !scoped) {
        setDepartments({});
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getDepartments(companyCode);

        if (cancelled) return;

        setDepartments(data || {});

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load department scope:", loadError);

        setDepartments({});

        setError(
          loadError.message || "Failed to load your departments."
        );

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, scoped, authLoading, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const scope = useMemo(
    () =>
      buildDepartmentScope({
        role,
        employeeId,
        departments,
      }),
    [role, employeeId, departments]
  );

  /*
  | Memoised on the scope, so a page that narrows a table and four cards does
  | not rebuild four callbacks whenever anything else re-renders.
  */

  const canReview = useCallback(
    (row) => canReviewRow(scope, row),
    [scope]
  );

  const inScope = useCallback(
    (row) => isRowInScope(scope, row),
    [scope]
  );

  const filterRows = useCallback(
    (rows) => filterRowsInScope(scope, rows),
    [scope]
  );

  const filterEmployees = useCallback(
    (employees) => filterEmployeesInScope(scope, employees),
    [scope]
  );

  const filterDirectory = useCallback(
    (directory) => filterDirectoryInScope(scope, directory),
    [scope]
  );

  const value = useMemo(
    () => ({

      scope,

      /*
      | Lifted out of the scope object as well, because these three read on a
      | page as a condition rather than as a property of something.
      */
      isScoped: scope.isScoped,
      isUnassigned: scope.isUnassigned,
      departments: scope.departments,

      scopeLabel: describeScope(scope),

      loading: loading || authLoading,
      error,
      reload,

      canReview,
      inScope,
      filterRows,
      filterEmployees,
      filterDirectory,

    }),
    [
      scope,
      loading,
      authLoading,
      error,
      reload,
      canReview,
      inScope,
      filterRows,
      filterEmployees,
      filterDirectory,
    ]
  );

  return (
    <ManagerScopeContext.Provider value={value}>
      {children}
    </ManagerScopeContext.Provider>
  );

};

export default ManagerScopeProvider;
