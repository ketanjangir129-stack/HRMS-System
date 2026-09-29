import { Navigate, useLocation } from "react-router-dom";

import NoAccess from "../components/common/NoAccess";
import PageAccessSkeleton from "../components/skeletons/PageAccessSkeleton";
import useRoleAccess from "../hooks/useRoleAccess";

/*
|--------------------------------------------------------------------------
| Permission Route
|--------------------------------------------------------------------------
| The guard every configurable page is mounted behind.
|
|   <PermissionRoute permission="attendance.reports">
|     <AttendanceReports />
|   </PermissionRoute>
|
| Hiding a link in the sidebar decides what is offered, not what is reachable:
| the address bar, a bookmark and the browser's history all bypass it. This is
| where the decision is actually enforced, and it is the reason a page can be
| withheld at all.
|
| A refused page is redirected rather than explained, because a role that was
| never meant to see a screen has no use for a notice about it. The redirect
| goes to whatever the role can actually open, so it cannot bounce between two
| pages it is refused from. `NoAccess` is the last resort for a role with
| nowhere left to send it.
|
| Owner passes before anything is read.
|--------------------------------------------------------------------------
*/

function PermissionRoute({
  permission = "",
  ownerOnly = false,
  children,
}) {

  const {
    loading,
    isOwner,
    canAccess,
    fallbackPath,
  } = useRoleAccess();

  const location = useLocation();

  /*
  | Nothing is decided until the configuration has arrived. Rendering the page
  | first and pulling it away a moment later would leak a screen the role
  | cannot open, and redirecting first would throw somebody off a page they
  | are perfectly entitled to.
  */
  if (loading) {
    return <PageAccessSkeleton />;
  }

  const allowed = isOwner
    ? true
    : ownerOnly
      ? false
      : !permission || canAccess(permission);

  if (allowed) {
    return children;
  }

  if (fallbackPath && fallbackPath !== location.pathname) {
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <NoAccess
      title={
        ownerOnly
          ? "Owner access only"
          : "You do not have access to this page"
      }
      message={
        ownerOnly
          ? "Only the account owner can open this section."
          : "Your role does not include this section. Contact the account owner if you need it enabled."
      }
      fallbackPath={
        fallbackPath && fallbackPath !== location.pathname
          ? fallbackPath
          : ""
      }
    />
  );

}

export default PermissionRoute;
