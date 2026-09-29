import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createLeaveRequest,
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  deleteLeaveRequest,
} from "../services/leaveServices/leaveService";

/*
|--------------------------------------------------------------------------
| Leave Requests
|--------------------------------------------------------------------------
| Requests are stored per company, so the whole list is loaded once and the
| scope is decided here:
|
|   employeeId given -> that employee's own requests (the dashboard)
|   employeeId omitted -> every request (the HR approval queue)
|
| A mutation bumps the reload key instead of refetching inline, so the list
| is reloaded from one place and a request that was approved elsewhere is
| picked up as well.
|--------------------------------------------------------------------------
*/

function useLeaveRequests(
  companyCode,
  employeeId
) {

  const [allRequests, setAllRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Load Requests
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setAllRequests([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getLeaveRequests(companyCode);

        if (cancelled) return;

        setAllRequests(data);

        setError(null);

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load leave requests:", loadError);

        setAllRequests([]);

        setError("Failed to load leave requests.");

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

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Scope & Order
  |--------------------------------------------------------------------------
  | Newest first, so the request just submitted is the first one on screen.
  */

  const requests = useMemo(() => {

    const scoped =
      employeeId
        ? allRequests.filter(
            (item) => item.employeeId === employeeId
          )
        : allRequests;

    return [...scoped].sort(
      (a, b) =>
        (b.requestedAt || 0) - (a.requestedAt || 0)
    );

  }, [allRequests, employeeId]);

  /*
  |--------------------------------------------------------------------------
  | Create Request
  |--------------------------------------------------------------------------
  */

  const createRequest =
    async (request) => {

      const result =
        await createLeaveRequest(
          companyCode,
          request
        );

      reload();

      return result;

    };

  /*
  |--------------------------------------------------------------------------
  | Approve Request
  |--------------------------------------------------------------------------
  | The whole request is passed on, not just its id: approving also books the
  | days against the employee's usage and that needs the employee, the dates
  | and the duration.
  */

  const approveRequest =
    async (
      request,
      approver
    ) => {

      const result =
        await approveLeaveRequest(
          companyCode,
          request,
          approver
        );

      reload();

      return result;

    };

  /*
  |--------------------------------------------------------------------------
  | Reject Request
  |--------------------------------------------------------------------------
  | Requests are stored under the day they were raised and the employee who
  | raised them, so the request itself is passed on rather than only its id:
  | those two fields are what locates it.
  */

  const rejectRequest =
    async (
      request,
      approver,
      remarks
    ) => {

      const result =
        await rejectLeaveRequest(
          companyCode,
          request,
          approver,
          remarks
        );

      reload();

      return result;

    };

  /*
  |--------------------------------------------------------------------------
  | Delete Request
  |--------------------------------------------------------------------------
  | Deleting an approved request has to release its days, so the request is
  | passed on instead of only its id.
  */

  const deleteRequest =
    async (request) => {

      const result =
        await deleteLeaveRequest(
          companyCode,
          request
        );

      reload();

      return result;

    };

  return {

    requests,

    loading,

    error,

    reload,

    createRequest,

    approveRequest,

    rejectRequest,

    deleteRequest,

  };

}

export default useLeaveRequests;
