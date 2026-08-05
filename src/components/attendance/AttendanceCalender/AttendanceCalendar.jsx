import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./AttendanceCalendar.css";
import { getAttendanceCalendar } from "../../../utils/attendance/attendanceUtils";

function AttendanceCalendar({
  history = [],
  loading
}) {

  const [value, setValue] = useState(new Date());
  const attendanceData = getAttendanceCalendar(history);

  const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getStatus = (date) => {
    const key = getLocalDateKey(date);
    return attendanceData[key];
  };

  const legend = [
    { label: "Present", color: "bg-emerald-500" },
    { label: "Late", color: "bg-amber-500" },
    { label: "Absent", color: "bg-red-500" },
    { label: "Leave", color: "bg-blue-500" },
  ];
  console.log("AttendanceCalendar history:", history);
  console.table(history);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Header */}
      <div className="mb-5">

        <h2 className="text-lg font-semibold text-slate-900">
          Attendance Calendar
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Monthly attendance overview
        </p>

      </div>

      <Calendar
        onChange={setValue}
        value={value}
        className="attendance-calendar"
        tileClassName={({ date, view }) => {
          if (view !== "month") return "";

          const status = getStatus(date);

          if (status === "present") return "present";
          if (status === "late") return "late";
          if (status === "absent") return "absent";
          if (status === "leave") return "leave";

          return "";

        }}
      />

      {/* Legend */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-6">

        {legend.map((item) => (

          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
          >

            <span className={`h-2 w-2 rounded-full ${item.color}`} />

            {item.label}

          </div>

        ))}

      </div>

    </div>
  );
}

export default AttendanceCalendar;
