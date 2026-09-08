import { FiSettings } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import WorkingHoursPanel from "../../components/attendance/settings/WorkingHoursPanel";

/*
|--------------------------------------------------------------------------
| Attendance Settings
|--------------------------------------------------------------------------
| Attendance preferences, for the signed in user's company only.
|
| The working day is the first section on it: the start time, the end time and
| the grace period every punch in on this company's records is measured
| against. Each section is a card that opens onto its own form, so a page that
| will grow past one section reads as a list of what can be configured rather
| than as a wall of fields; anything added later belongs in this stack beneath
| it.
|
| The whole page is mounted behind `PermissionRoute permission="attendance.settings"`,
| which is off for HR, manager and employee by default - so it is the owner's
| screen until the owner hands it out on Roles & Access.
|--------------------------------------------------------------------------
*/

function AttendanceSettings() {
  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Attendance Settings"
        subtitle="Configure attendance rules and preferences"
        icon={<FiSettings />}
      />

      {/*
        The settings grid. Each section is a card in it, and a card that has
        been opened takes the whole row for its form - so the grid is what
        decides how big a closed card is, and the card is what decides how much
        of the row it needs.
      */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">

        <WorkingHoursPanel />

      </div>

    </div>
  );
}

export default AttendanceSettings;
