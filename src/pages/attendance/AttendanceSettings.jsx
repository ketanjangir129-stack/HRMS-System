import { FiBell, FiMapPin, FiSettings } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";

/*
|--------------------------------------------------------------------------
| Attendance Settings
|--------------------------------------------------------------------------
| Attendance preferences. The working day rules live in
| `utils/attendance/attendanceConstants.js`.
|--------------------------------------------------------------------------
*/

const SETTINGS = [
  {
    title: "Geo Fencing",
    description: "Allowed locations for punch in",
    icon: <FiMapPin />,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Notifications",
    description: "Late arrival and absence alerts",
    icon: <FiBell />,
    color: "bg-amber-50 text-amber-600",
  },
];

function AttendanceSettings() {
  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Attendance Settings"
        subtitle="Configure attendance rules and preferences"
        icon={<FiSettings />}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">

        {SETTINGS.map((item) => (

          <div
            key={item.title}
            className="ui-card ui-card-body"
          >

            <div className={`ui-tile text-xl ${item.color}`}>
              {item.icon}
            </div>

            <h2 className="ui-card-title mt-4">
              {item.title}
            </h2>

            <p className="ui-card-subtitle">
              {item.description}
            </p>

            <span className="ui-badge mt-4 bg-surface-muted text-ink-subtle">
              Coming soon
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AttendanceSettings;
