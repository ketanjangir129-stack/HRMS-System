import { useEffect, useState, useCallback } from "react";
import { getEmployees } from "../services/EmployeeService";
import { db } from "../firebase/firebase";
import { ref, get } from "firebase/database";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const getMonthLabel = (year, month) =>
  `${MONTHS[month - 1]} ${year}`;

export const getMonthDisplay = (year, month) =>
  `${String(month).padStart(2, "0")}-${year}`;

/*
|--------------------------------------------------------------------------
| Aggregate monthly attendance for ALL employees
|--------------------------------------------------------------------------
*/

const buildMonthlyReport = (employees, monthRecords) => {
  // monthRecords: { [date]: { [employeeId]: record } }

  const report = Object.keys(employees).map((employeeId) => {
    const employee = employees[employeeId];

    const name =
      employee.personalInfo?.name ||
      employee.employmentInfo?.name ||
      "";

    const department =
      employee.employmentInfo?.department || "";

    const designation =
      employee.employmentInfo?.designation || "";

    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      workingDays: 0,
      totalWorkingHours: 0,
    };

    Object.values(monthRecords).forEach((dayRecords) => {
      const record = dayRecords[employeeId];

      if (!record) return;

      summary.workingDays++;

      switch (record.status) {
        case "Present":
          summary.present++;
          break;
        case "Late":
          summary.late++;
          break;
        case "Absent":
          summary.absent++;
          break;
        case "Leave":
          summary.leave++;
          break;
        default:
          break;
      }

      const minutes = parseHours(record.workingHours);
      summary.totalWorkingHours += minutes;
    });

    const attended = summary.present + summary.late;
    const attendanceRate =
      summary.workingDays === 0
        ? 0
        : Math.round(
            (attended / summary.workingDays) * 100
          );

    return {
      employeeId,
      name,
      department,
      designation,
      ...summary,
      attendanceRate,
      workingHours:
        `${Math.floor(summary.totalWorkingHours / 60)}h ${
          summary.totalWorkingHours % 60
        }m`,
    };
  });

  // Sort by name by default
  report.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return report;
};

const parseHours = (value = "") => {
  const match = String(value).match(/(\d+)h\s*(\d+)m/);

  if (!match) return 0;

  return Number(match[1]) * 60 + Number(match[2]);
};

/*
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

const useMonthlyAttendance = (companyCode, year, month) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        if (!companyCode) {
          if (!cancelled) {
            setRows([]);
            setLoading(false);
          }
          return;
        }

        const [employees, recordsSnapshot] = await Promise.all([
          getEmployees(companyCode),
          get(
            ref(
              db,
              `companies/${companyCode}/attendance/records`
            )
          ),
        ]);

        if (cancelled) return;

        const records = recordsSnapshot.exists()
          ? recordsSnapshot.val()
          : {};

        const prefix = `${year}-${String(month).padStart(2, "0")}`;

        const monthRecords = {};

        Object.entries(records).forEach(([date, dayRecords]) => {
          if (date.startsWith(prefix)) {
            monthRecords[date] = dayRecords;
          }
        });

        const report = buildMonthlyReport(employees, monthRecords);

        setRows(report);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load monthly attendance:", err);
        setError(err.message || "Failed to load monthly attendance.");
        setRows([]);
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
  }, [companyCode, year, month, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    rows,
    loading,
    error,
    reload,
  };
};

export default useMonthlyAttendance;
