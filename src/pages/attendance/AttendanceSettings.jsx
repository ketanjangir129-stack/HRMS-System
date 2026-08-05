import { FiSettings, FiClock, FiMapPin, FiBell } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";

const settings = [
  {
    title: "Shift Timings",
    description: "Default office hours and grace period",
    icon: <FiClock />,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Geo Fencing",
    description: "Allowed locations for check-in",
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

function AttendanceSettings(){
  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Attendance Settings"
        subtitle="Configure attendance rules and preferences"
        icon={<FiSettings />}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {settings.map((item) => (

          <div
            key={item.title}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200"
          >

            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-transform duration-300 group-hover:scale-110 ${item.color}`}
            >
              {item.icon}
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {item.title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {item.description}
            </p>

          </div>

        ))}

      </div>

    </div>
  )
}

export default AttendanceSettings;
