import { useCallback, useEffect, useMemo, useState } from "react";

import { getUpcomingHolidays as fetchUpcomingHolidays } from "../services/holidayServices/holidayService";
import { getDateKey } from "../utils/attendance/attendanceDate";
import {
  UPCOMING_HOLIDAYS,
} from "../utils/holiday/holidayConstants";
import { getUpcomingHolidays } from "../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays
|--------------------------------------------------------------------------
| The next holidays from today onwards, nearest first.
|
| The service crosses the year boundary for us: late in December the current
| year has nothing left to show, so it reads the next one as well. That is
| why this is a read of its own instead of a filter over `useHolidays`, which
| only ever holds the year on screen.
|
| The countdown each card shows is derived here rather than stored, so a list
| left open overnight is re-labelled the moment anything re-renders it.
|--------------------------------------------------------------------------
*/

function useUpcomingHolidays(
  companyCode,
  limit = UPCOMING_HOLIDAYS
) {

  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setHolidays([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await fetchUpcomingHolidays(companyCode, {
          from: getDateKey(),
          limit,
        });

        if (cancelled) return;

        setHolidays(data);

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load upcoming holidays:", loadError);

        setHolidays([]);

        setError(
          loadError.message || "Failed to load upcoming holidays."
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

  }, [companyCode, limit, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  /*
  | Sorted and stamped with the days remaining, so a card can say "Tomorrow"
  | without working it out while it renders.
  */

  const upcoming = useMemo(
    () =>
      getUpcomingHolidays(holidays, {
        from: getDateKey(),
        limit,
      }),
    [holidays, limit]
  );

  return {

    holidays: upcoming,

    loading,

    error,

    reload,

  };

}

export default useUpcomingHolidays;
