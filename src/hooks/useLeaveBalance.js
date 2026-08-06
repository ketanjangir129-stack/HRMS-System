import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getLeaveSettings,
  getLeaveUsage,
} from "../services/leaveServices/leaveService";
import {
  calculateLeaveBalance,
} from "../utils/leave/leaveUtils";

/*
|--------------------------------------------------------------------------
| Leave Balance
|--------------------------------------------------------------------------
| The balance is never stored: it is derived from the company settings and
| the employee's usage for the year, so a change to the annual allocation is
| reflected everywhere without a migration.
|
| Settings and usage are kept in state and the balance is recomputed from
| them, so a newly raised request changes the balance through `pendingDays`
| without another read.
|
| `pendingDays` is owned by the caller, which already has the request list.
|--------------------------------------------------------------------------
*/

function useLeaveBalance(
  companyCode,
  employeeId,
  year,
  pendingDays = 0
) {

  const [source, setSource] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (
        !companyCode ||
        !employeeId ||
        !year
      ) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const [
          settings,
          usage,
        ] = await Promise.all([
          getLeaveSettings(
            companyCode
          ),
          getLeaveUsage(
            companyCode,
            employeeId,
            year
          ),
        ]);

        if (cancelled) return;

        setSource({
          settings,
          usage,
        });

        setError(null);

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load leave balance:", loadError);

        setError(
          "Failed to load leave balance."
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

  }, [companyCode, employeeId, year, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const balance = useMemo(() => {

    if (!source) return null;

    return calculateLeaveBalance(
      source.settings,
      source.usage,
      year,
      pendingDays
    );

  }, [source, year, pendingDays]);

  return {

    balance,

    settings: source?.settings || null,

    loading,

    error,

    reload,

  };

}

export default useLeaveBalance;
