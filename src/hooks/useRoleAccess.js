import { useContext } from "react";
import { RoleAccessContext } from "../context/RoleAccessContext";

/*
|--------------------------------------------------------------------------
| Role Access
|--------------------------------------------------------------------------
| What the signed in user is allowed to see.
|
| The company code and the role are resolved by the provider from the existing
| authentication, so a caller asks by permission alone:
|
|   const { canAccessPage, canAccessSection } = useRoleAccess();
|
|   canAccessPage("attendance")
|   canAccessSection("attendance.analytics")
|
| Both answer true for the owner without reading anything, and both are safe
| to call while authentication is still loading: `loading` says the answer is
| not final yet, and anything that would hide a screen should wait for it
| rather than flash the page away.
|--------------------------------------------------------------------------
*/

const useRoleAccess = () => {

  const context = useContext(RoleAccessContext);

  if (!context) {
    throw new Error(
      "useRoleAccess must be used within a RoleAccessProvider"
    );
  }

  return context;

};

export default useRoleAccess;
