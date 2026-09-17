import { useMemo } from "react";
import useEmployees from "./useEmployees";
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
|
| The list itself comes from the shared store (useEmployees) rather than a
| fetch of its own. Eight attendance and leave screens use this hook, and
| each used to download the whole employee node again on open; now they
| share one live listener. The return shape is unchanged, so none of those
| screens had to change with it.
|--------------------------------------------------------------------------
*/

const useEmployeeDirectory = (companyCode) => {

  const { employees, loading, error, reload } = useEmployees(companyCode);

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
