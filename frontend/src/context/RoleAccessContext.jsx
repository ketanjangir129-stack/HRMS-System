import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useAuth from "../hooks/useAuth";
import { getRoleAccess } from "../services/settings/roleAccessService";
import { getUserRole } from "../utils/attendance/attendanceRequestUtils";
import {
  getAccessiblePages,
  getFallbackPath,
  hasPageAccess,
  hasSectionAccess,
  isOwnerRole,
  normalizeRoleAccess,
} from "../utils/permissions/permissionUtils";

/*
|--------------------------------------------------------------------------
| Role Access
|--------------------------------------------------------------------------
| The company's Roles & Access configuration, loaded once for the session.
|
| The sidebar, every route guard and every panel that can be withheld all ask
| the same question on every render. Loading this per consumer would fire a
| read per screen and let two of them disagree while one was still in flight,
| so it is read once here and shared, the same way the signed in user is.
|
| The record is normalised against the defaults as soon as it arrives, so the
| tree handed out is always complete and every check below it is a lookup.
|
| Nothing here decides anything: the answers come from the permission
| utilities, which the Settings screen also uses to preview a draft.
|--------------------------------------------------------------------------
*/

export const RoleAccessContext = createContext();

export const RoleAccessProvider = ({ children }) => {

  const { company, currentUser, loading: authLoading } = useAuth();

  const companyCode = company?.companyCode;

  const role = getUserRole(currentUser);

  const [stored, setStored] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Load
  |--------------------------------------------------------------------------
  | The read waits for authentication, because the company code it needs comes
  | from it, and answering before it arrives would hand every consumer a set of
  | defaults it would then have to unlearn.
  |
  | A failed read is not treated as "no access". The defaults stand in and the
  | error is published alongside them, so a company whose database is briefly
  | unreachable keeps working instead of losing its navigation.
  */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!companyCode) {
        setStored(null);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getRoleAccess(companyCode);

        if (cancelled) return;

        setStored(data);

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load role access:", loadError);

        setStored(null);

        setError(
          loadError.message || "Failed to load role permissions."
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

  }, [companyCode, authLoading, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const access = useMemo(
    () => normalizeRoleAccess(stored),
    [stored]
  );

  const isOwner = isOwnerRole(role);

  /*
  | Memoised on the tree and the role, so a page that guards ten panels does
  | not rebuild ten callbacks whenever anything else re-renders.
  */

  const canAccessPage = useCallback(
    (pageKey) => hasPageAccess(access, role, pageKey),
    [access, role]
  );

  const canAccessSection = useCallback(
    (path) => hasSectionAccess(access, role, path),
    [access, role]
  );

  const accessiblePages = useMemo(
    () => getAccessiblePages(access, role),
    [access, role]
  );

  const fallbackPath = useMemo(
    () => getFallbackPath(access, role),
    [access, role]
  );

  const value = useMemo(
    () => ({
      access,
      role,
      isOwner,
      loading: loading || authLoading,
      error,
      canAccessPage,
      canAccessSection,
      /*
      | The same check under the name a caller reaches for when it is holding
      | a permission string and does not know which kind it is.
      */
      canAccess: canAccessSection,
      accessiblePages,
      fallbackPath,
      reload,
    }),
    [
      access,
      role,
      isOwner,
      loading,
      authLoading,
      error,
      canAccessPage,
      canAccessSection,
      accessiblePages,
      fallbackPath,
      reload,
    ]
  );

  return (
    <RoleAccessContext.Provider value={value}>
      {children}
    </RoleAccessContext.Provider>
  );

};

export default RoleAccessProvider;
