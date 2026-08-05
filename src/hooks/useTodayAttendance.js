import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/firebase";

const useTodayAttendance = (companyCode) => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyCode) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const attendanceRef = ref(
      db,
      `companies/${companyCode}/attendance/records/${today}`
    );

    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        setAttendance(Object.values(data));
      } else {
        setAttendance([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyCode]);

  return {
    attendance,
    loading,
  };
};

export default useTodayAttendance;