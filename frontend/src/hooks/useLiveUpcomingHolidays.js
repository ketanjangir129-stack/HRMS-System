import { useCallback, useEffect, useMemo, useState } from "react";

import { getUpcomingHolidays as fetchUpcomingHolidays } from "../services/holidayServices/holidayService";
import { getDateKey } from "../utils/attendance/attendanceDate";
import { UPCOMING_HOLIDAYS } from "../utils/holiday/holidayConstants";
import { getUpcomingHolidays } from "../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays (kept fresh)
|--------------------------------------------------------------------------
| The same list `useUpcomingHolidays` returns, kept current on a screen that
| is left open all day.
|
| It used to listen to two whole years of the holidays tree in Firebase. Only
| the owner signs in to Firebase, so for everybody else that listener either
| failed or relied on the database being readable without a login. It now
| reads the backend's /holidays/upcoming endpoint, which already crosses into
| next year on its own, and re-reads it:
|
|   - at midnight, because "upcoming" is measured from today;
|   - every REFRESH_MS while the tab is visible;
|   - when the tab becomes visible again.
|--------------------------------------------------------------------------
*/

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 15 * 60 * 1000;

/*
| Milliseconds until the next midnight, so the day can be re-read the moment
| it changes rather than polled for.
*/

const msUntilTomorrow = () => {

  const now = new Date();

  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return Math.max(midnight.getTime() - now.getTime(), 1000);

};

function useLiveUpcomingHolidays(
  companyCode,
  limit = UPCOMING_HOLIDAYS
) {

  const [today, setToday] = useState(() => getDateKey());

  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  /*
  | One timer at a time, re-armed after every midnight. The date is re-read
  | from the system rather than stepped forward, so a machine that slept
  | through the change still wakes up on the right day.
  */

  useEffect(() => {

    const timer = setTimeout(() => {

      setToday(getDateKey());

    }, Math.min(msUntilTomorrow(), DAY_MS));

    return () => clearTimeout(timer);

  }, [today]);

  // Periodic refresh while visible, and an immediate one on returning.
  useEffect(() => {

    if (!companyCode) return undefined;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };

  }, [companyCode, reload]);

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode) {
        setHolidays([]);
        setLoading(false);
        return;
      }

      // Background refreshes keep the current list on screen.
      if (reloadKey === 0) setLoading(true);

      try {

        const data = await fetchUpcomingHolidays(companyCode, {
          from: today,
          limit,
        });

        if (cancelled) return;

        setHolidays(data);
        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load upcoming holidays:", loadError);

        setError(
          loadError.message || "Failed to load upcoming holidays."
        );

      } finally {

        if (!cancelled) setLoading(false);

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, today, limit, reloadKey]);

  /*
  | Sorted and stamped with the days remaining, so a card can say "Tomorrow"
  | without working it out while it renders.
  */

  const upcoming = useMemo(
    () =>
      getUpcomingHolidays(holidays, {
        from: today,
        limit,
      }),
    [holidays, today, limit]
  );

  return {

    holidays: upcoming,

    loading,

    error,

    reload,

  };

}

export default useLiveUpcomingHolidays;
