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

      <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">

        {SETTINGS.map((item) => (

          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >

            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg sm:h-12 sm:w-12 sm:text-xl ${item.color}`}
            >
              {item.icon}
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {item.title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {item.description}
            </p>

            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Coming soon
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AttendanceSettings;
