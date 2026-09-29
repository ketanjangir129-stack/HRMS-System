import { useCallback, useEffect, useState } from "react";
import { getMonthlyAttendanceRecords } from "../services/attendanceServices/attendanceService";

/*
|--------------------------------------------------------------------------
| Monthly Attendance Records
|--------------------------------------------------------------------------
| The raw `{ [date]: { [employeeId]: record } }` tree for one month. Turning
| it into monthly, employee or department rows is done by the attendance
| utilities, so the same fetch serves every report.
|--------------------------------------------------------------------------
*/

const useMonthlyAttendance = (companyCode, year, month) => {

  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setRecords({});
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getMonthlyAttendanceRecords(
          companyCode,
          year,
          month
        );

        if (cancelled) return;

        setRecords(data);
        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load monthly attendance:", loadError);

        setRecords({});

        setError(
          loadError.message || "Failed to load monthly attendance."
        );

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
    records,
    loading,
    error,
    reload,
  };

};

export default useMonthlyAttendance;
