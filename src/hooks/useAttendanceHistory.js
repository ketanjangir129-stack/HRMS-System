import { useEffect, useState } from "react";

import { getEmployeeAttendanceHistory } from "../services/attendanceServices/attendanceService";

const useAttendanceHistory = (
  companyCode,
  employeeId,
  year,
  month
) => {

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (
      !companyCode ||
      !employeeId
    ) {
      return;
    }

    const loadHistory = async () => {

      setLoading(true);

      const data =
        await getEmployeeAttendanceHistory(
          companyCode,
          employeeId,
          year,
          month
        );

      setHistory(data);

      setLoading(false);

    };

    loadHistory();

  }, [
    companyCode,
    employeeId,
    year,
    month,
  ]);

  return {
    history,
    loading,
  };

};

export default useAttendanceHistory;