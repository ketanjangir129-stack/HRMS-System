import RoleAccessPanel from "../../components/settings/rolesAccess/RoleAccessPanel";
import SettingsHeader from "../../components/settings/SettingsHeader";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import NoAccess from "../../components/common/NoAccess";

/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
| Company configuration, owner only. Roles & Access is the first section on
| it; anything added later belongs in this stack beneath it.
|
| The route is already guarded, so the check here is the second lock rather
| than the first: this page is also what the sidebar links to and what a
| bookmark reopens, and a component that renders the permission matrix should
| not depend on somebody else having checked who is asking.
|--------------------------------------------------------------------------
*/

function Settings() {

  const { company } = useAuth();

  const { isOwner } = useRoleAccess();

  if (!isOwner) {
    return (
      <NoAccess
        title="Owner access only"
        message="Only the account owner can manage company settings."
        fallbackPath="/dashboard"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-0 sm:space-y-6 sm:p-2">

      <SettingsHeader companyName={company?.companyName} />

      <RoleAccessPanel />

    </div>
  );

}

export default Settings;
