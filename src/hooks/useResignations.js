import { useCallback, useEffect, useMemo, useState } from "react";

import useAuth from "./useAuth";
import useManagerScope from "./useManagerScope";
import useRoleAccess from "./useRoleAccess";

import {
  getResignationById,
  getResignations,
} from "../services/resignation/resignationService";

import {
  getCurrentEmployeeId,
  getUserRole,
} from "../utils/attendance/attendanceRequestUtils";

import {
  filterVisibleResignations,
  getActiveResignation,
  getResignationSummary,
  isAwaitingUser,
  isOwnResignation,
  sortByNewest,
} from "../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignations
|--------------------------------------------------------------------------
| The company's exits, loaded once and narrowed here.
|
| Shaped like `useLeaveRequests`: one read of the whole branch, then every
| view of it derived in memory. Resignations are counted in dozens rather
| than thousands (see the note on the storage path in `resignationService`),
| so a screen that shows a queue, a summary and the signed in user's own
| record costs one request rather than three.
|
| The narrowing is done with `filterVisibleResignations`, which is the same
| pure check the service guards use. What a queue offers and what a write
| will actually accept therefore cannot disagree - the alternative is a row
| with an Approve button on it that fails when pressed.
|
| The three identities a caller would otherwise have to assemble itself - the
| role, the employee id and the department scope - are resolved here from the
| existing contexts, so a page asks for resignations and gets the ones it is
| entitled to.
|--------------------------------------------------------------------------
*/

function useResignations() {

  const { company, currentUser } = useAuth();

  const { scope, loading: scopeLoading } = useManagerScope();

  const { canAccessSection, loading: accessLoading } = useRoleAccess();

  const companyCode =
    company?.companyCode || localStorage.getItem("companyCode");

  const role = getUserRole(currentUser);

  /*
  | The employee id, read the way the profile reads it. An owner has neither
  | an employment record nor a username, so this is empty for them - which is
  | correct: the owner has no resignation of their own and every "is this
  | mine" check below should answer no.
  */
  const employeeId =
    getCurrentEmployeeId(currentUser) ||
    currentUser?.account?.username ||
    "";

  const canFinanceApprove = canAccessSection("resignation.financeApprove");

  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getResignations(companyCode);

        if (cancelled) return;

        setRecords(data);

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load resignations:", loadError);

        setRecords([]);

        setError("Failed to load resignations.");

      } finally {

        if (!cancelled) setLoading(false);

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  /*
  | Everything the signed in user may see, newest first.
  |
  | It waits for the department scope. A manager whose scope has not resolved
  | yet would otherwise be shown the whole company for one render and have it
  | taken away on the next, which is the flash `useManagerScope` documents.
  */

  const visible = useMemo(() => {

    if (scopeLoading) return [];

    return sortByNewest(
      filterVisibleResignations(records, { role, employeeId, scope })
    );

  }, [records, role, employeeId, scope, scopeLoading]);

  /* The signed in user's own, however many they have raised over time. */
  const mine = useMemo(
    () =>
      sortByNewest(
        records.filter((record) => isOwnResignation(record, employeeId))
      ),
    [records, employeeId]
  );

  /*
  | The one in flight, or null. This is what the profile button reads to
  | decide between offering to resign and offering to open the tracker.
  */
  const activeResignation = useMemo(
    () => getActiveResignation(mine),
    [mine]
  );

  /*
  | The rows waiting on this particular user. A resignation is pending for
  | somebody at every stage; these are the ones pending for *you*, which is
  | what the queue's first tab counts and what the sidebar badge would read.
  */
  const awaitingMe = useMemo(
    () =>
      visible.filter((record) =>
        isAwaitingUser(record, {
          role,
          employeeId,
          scope,
          canFinanceApprove,
        })
      ),
    [visible, role, employeeId, scope, canFinanceApprove]
  );

  const summary = useMemo(
    () => getResignationSummary(visible),
    [visible]
  );

  return {

    /* Data */
    resignations: visible,
    mine,
    activeResignation,
    awaitingMe,
    summary,

    /* State */
    loading: loading || scopeLoading || accessLoading,
    error,
    reload,

    /* The identity every action needs, resolved once. */
    companyCode,
    role,
    employeeId,
    scope,
    canFinanceApprove,

  };

}

/*
|--------------------------------------------------------------------------
| One Resignation
|--------------------------------------------------------------------------
| A single record read by id, for the three screens that are reached by an
| address rather than by clicking a row - the equipment form from an email
| link, the settlement worksheet, and the certificate.
|
| It reads that one node instead of the whole branch. Those pages are opened
| from an inbox by somebody who may have nothing else loaded, and asking for
| every resignation in the company to show one of them would be the wrong
| trade even at these volumes.
|
| Whether the caller is *allowed* to see what comes back is not decided here.
| It is decided by `canViewResignation` on the page, against the same scope
| every other screen uses - so this hook stays a read and the entitlement
| stays in one place.
|--------------------------------------------------------------------------
*/

export function useResignation(resignationId) {

  const { company, currentUser } = useAuth();

  const { scope, loading: scopeLoading } = useManagerScope();

  const { canAccessSection, loading: accessLoading } = useRoleAccess();

  const companyCode =
    company?.companyCode || localStorage.getItem("companyCode");

  const role = getUserRole(currentUser);

  const employeeId =
    getCurrentEmployeeId(currentUser) ||
    currentUser?.account?.username ||
    "";

  const [resignation, setResignation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode || !resignationId) {
        setResignation(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getResignationById(companyCode, resignationId);

        if (cancelled) return;

        setResignation(data);

        setError(data ? "" : "This resignation could not be found.");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load the resignation:", loadError);

        setResignation(null);

        setError("Failed to load this resignation.");

      } finally {

        if (!cancelled) setLoading(false);

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, resignationId, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {

    resignation,
    loading: loading || scopeLoading || accessLoading,
    error,
    reload,

    companyCode,
    role,
    employeeId,
    scope,
    canFinanceApprove: canAccessSection("resignation.financeApprove"),

    /* The actor stamped onto whatever this page writes. */
    actor: {
      employeeId,
      name:
        currentUser?.personalInfo?.name ||
        currentUser?.name ||
        employeeId,
    },

  };

}

export default useResignations;
