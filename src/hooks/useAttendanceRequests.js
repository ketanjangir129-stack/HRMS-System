import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/firebase";
import {
  createAttendanceRequest,
  updateAttendanceRequest,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  deleteAttendanceRequest,
} from "../services/attendanceServices/attendanceRequestService";

function useAttendanceRequests(companyCode) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Realtime subscription keeps the UI instantly in sync after any action.
  useEffect(() => {
    if (!companyCode) return;

    const requestRef = ref(
      db,
      `companies/${companyCode}/attendance/requests`
    );

    return onValue(requestRef, (snapshot) => {
      if (snapshot.exists()) {
        setRequests(
          Object.values(snapshot.val()).sort(
            (a, b) => b.requestedAt - a.requestedAt
          )
        );
      } else {
        setRequests([]);
      }
      setLoading(false);
    });
  }, [companyCode]);

  const create = async (request) => {
    return createAttendanceRequest(companyCode, request);
  };

  const update = async (requestId, updates) => {
    return updateAttendanceRequest(companyCode, requestId, updates);
  };

  const approve = async (request, hrName) => {
    return approveAttendanceRequest(companyCode, request, hrName);
  };

  const reject = async (requestId, hrName, remarks) => {
    return rejectAttendanceRequest(companyCode, requestId, hrName, remarks);
  };

  const remove = async (requestId) => {
    return deleteAttendanceRequest(companyCode, requestId);
  };

  return {
    requests,
    loading,
    create,
    update,
    approve,
    reject,
    remove,
  };
}

export default useAttendanceRequests;
