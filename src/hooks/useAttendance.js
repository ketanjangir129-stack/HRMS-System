import { useEffect, useState } from "react";
import {
  ref,
  onValue,
} from "firebase/database";
import { db } from "../firebase/firebase";
import {
  checkInEmployee,
  checkOutEmployee,
} from "../services/attendanceServices/attendanceService";

const useAttendance = (
  companyCode,
  currentUser
) => {

  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
  ------------------------------------
  Check In
  ------------------------------------
  */

  const checkIn = async () => {

    const result =
      await checkInEmployee(
        companyCode,
        currentUser
      );

    if (result.success) {

      setAttendance(result.data);

    }

    return result;

  };

  /*
  ------------------------------------
  Check Out
  ------------------------------------
  */

  const checkOut = async () => {

    const result =
      await checkOutEmployee(
        companyCode,
        currentUser.employmentInfo.employeeId
      );

    return result;

  };
  useEffect(() => {

    if (
      !companyCode ||
      !currentUser
    ) {
      setLoading(false);
      return;
    }

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const attendanceRef = ref(
      db,
      `companies/${companyCode}/attendance/records/${today}/${currentUser.employmentInfo.employeeId}`
    );

    const unsubscribe = onValue(
      attendanceRef,
      (snapshot) => {

        if (snapshot.exists()) {
          setAttendance(snapshot.val());
        } else {
          setAttendance(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();

  }, [companyCode, currentUser]);

  return {
    attendance,
    loading,
    checkIn,
    checkOut,
  };

};

export default useAttendance;