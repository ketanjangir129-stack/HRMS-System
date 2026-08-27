import RoleAccessPanel from "../../components/settings/rolesAccess/RoleAccessPanel";
import OfficeLocationPanel from "../../components/settings/officeLocation/OfficeLocationPanel";
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
    <div className="flex-1 min-h-full">

      <SettingsHeader companyName={company?.companyName} />

      {/*
        The panels stack full width on the same rhythm the dashboard grid uses
        between its cards, so the two pages breathe the same way.
      */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">

        <RoleAccessPanel />

        <OfficeLocationPanel />

      </div>

    </div>
  );

}

export default Settings;
