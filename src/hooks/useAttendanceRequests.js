import { useCallback, useEffect, useState } from "react";
import {
  createAttendanceRequest,
  updateAttendanceRequest,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  deleteAttendanceRequest,
  subscribeToAttendanceRequests,
} from "../services/attendanceServices/attendanceRequestService";

/*
|--------------------------------------------------------------------------
| Attendance Requests
|--------------------------------------------------------------------------
| Realtime list plus the request actions. Every action resolves to the
| service result `{ success, message }`, so callers decide which toast to
| show without knowing anything about Firebase.
|--------------------------------------------------------------------------
*/

const EMPTY = [];

function useAttendanceRequests(companyCode) {

  const [state, setState] = useState({
    key: "",
    requests: EMPTY,
    error: "",
  });

  const enabled = Boolean(companyCode);

  const isCurrent = state.key === companyCode;

  useEffect(() => {

    if (!enabled) return undefined;

    const unsubscribe = subscribeToAttendanceRequests(
      companyCode,
      (requests) => {
        setState({ key: companyCode, requests, error: "" });
      },
      // Without this the subscription fails silently and loading never ends.
      (subscriptionError) => {

        console.error(
          "Failed to load attendance requests:",
          subscriptionError
        );

        setState({
          key: companyCode,
          requests: EMPTY,
          error:
            subscriptionError.message ||
            "Failed to load attendance requests.",
        });

      }
    );

    return () => unsubscribe();

  }, [companyCode, enabled]);

  const create = useCallback(
    (request) => createAttendanceRequest(companyCode, request),
    [companyCode]
  );

  const update = useCallback(
    (requestId, updates) =>
      updateAttendanceRequest(companyCode, requestId, updates),
    [companyCode]
  );

  const approve = useCallback(
    (request, approvedBy) =>
      approveAttendanceRequest(companyCode, request, approvedBy),
    [companyCode]
  );

  const reject = useCallback(
    (requestId, approvedBy, remarks) =>
      rejectAttendanceRequest(companyCode, requestId, approvedBy, remarks),
    [companyCode]
  );

  const remove = useCallback(
    (requestId) => deleteAttendanceRequest(companyCode, requestId),
    [companyCode]
  );

  return {
    requests: isCurrent ? state.requests : EMPTY,
    loading: enabled && !isCurrent,
    error: isCurrent ? state.error : "",
    create,
    update,
    approve,
    reject,
    remove,
  };

}

export default useAttendanceRequests;
