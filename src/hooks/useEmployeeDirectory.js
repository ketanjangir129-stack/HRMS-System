import { useCallback, useEffect, useMemo, useState } from "react";
import { getEmployees } from "../services/EmployeeService";
import {
  buildEmployeeDirectory,
  getActiveEmployees,
  getDepartments,
} from "../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Employee Directory
|--------------------------------------------------------------------------
| Attendance records store the employee id only, so every screen that shows a
| name, department or designation resolves it through this lookup.
|
| It also carries the active roster size, which attendance summaries need as
| the denominator: without it the present rate is measured against "everyone
| who showed up" and is always ~100%.
|--------------------------------------------------------------------------
*/

const useEmployeeDirectory = (companyCode) => {

  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setEmployees({});
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getEmployees(companyCode);

        if (cancelled) return;

        setEmployees(data);
        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load employees:", loadError);

        setEmployees({});

        setError(loadError.message || "Failed to load employees.");

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

  }, [companyCode, reloadKey]);

  const directory = useMemo(
    () => buildEmployeeDirectory(employees),
    [employees]
  );

  const activeEmployees = useMemo(
    () => getActiveEmployees(directory),
    [directory]
  );

  const departments = useMemo(
    () => getDepartments(directory),
    [directory]
  );

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    directory,
    departments,
    activeEmployees,
    activeCount: activeEmployees.length,
    loading,
    error,
    reload,
  };

};

export default useEmployeeDirectory;
