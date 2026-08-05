import { useEffect, useState } from "react";

import { subscribeToEmployeeAttendanceHistory } from "../services/attendanceServices/attendanceService";

const useAttendanceHistory = (
  companyCode,
  employeeId,
  year,
  month
) => {

  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  /*
  | Loading is derived from which month has actually been delivered, so it
  | resets on its own when the parameters change without having to set state
  | from inside the effect body.
  */
  const requestKey = `${companyCode}|${employeeId}|${year}|${month}`;

  const [loadedKey, setLoadedKey] = useState("");

  const loading = loadedKey !== requestKey;

  useEffect(() => {

    if (
      !companyCode ||
      !employeeId
    ) {
      return;
    }

    const unsubscribe =
      subscribeToEmployeeAttendanceHistory(
        companyCode,
        employeeId,
        year,
        month,
        (data) => {

          setHistory(data);
          setError("");
          setLoadedKey(requestKey);

        },
        // Without this the subscription fails silently and loading never ends.
        (subscriptionError) => {

          console.error(
            "Failed to load attendance history:",
            subscriptionError
          );

          setHistory([]);

          setError(
            subscriptionError.message ||
            "Failed to load attendance history."
          );

          setLoadedKey(requestKey);

        }
      );

    return () => unsubscribe();

  }, [
    companyCode,
    employeeId,
    year,
    month,
    requestKey,
  ]);

  return {
    history,
    loading,
    error,
  };

};

export default useAttendanceHistory;
