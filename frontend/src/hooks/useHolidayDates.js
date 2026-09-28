import { useCallback, useEffect, useMemo, useState } from "react";

import { getHolidaysForYears } from "../services/holidayServices/holidayService";
import {
  buildHolidayMap,
  getHolidayDates,
  toHolidaySet,
} from "../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holiday Dates
|--------------------------------------------------------------------------
| The declared holidays of one or more years, as the lookups the attendance
| and leave modules actually ask questions with: a set of date keys, and a
| date keyed map when the holiday itself has to be named.
|
| Several years at once because a leave range, and a report period, can both
| straddle a new year. `useHolidays` is the dashboard's hook and only ever
| holds the single year on screen; this one is the integration hook.
|
| The years are joined into a string for the dependency list. An array is a
| new value on every render, so depending on it directly would reload on
| every render forever.
|
| A failed read is reported but never blocks: attendance and leave keep
| working with no holidays applied rather than refusing to render.
|--------------------------------------------------------------------------
*/

function useHolidayDates(companyCode, years = []) {

  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const yearKey = useMemo(
    () =>
      [
        ...new Set(
          (Array.isArray(years) ? years : [years])
            .map(Number)
            .filter((year) => Boolean(year))
        ),
      ]
        .sort((a, b) => a - b)
        .join(","),
    [years]
  );

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      const yearList = yearKey
        ? yearKey.split(",").map(Number)
        : [];

      if (!companyCode || yearList.length === 0) {
        setHolidays([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getHolidaysForYears(
          companyCode,
          yearList
        );

        if (cancelled) return;

        setHolidays(data);

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load holiday dates:", loadError);

        setHolidays([]);

        setError(loadError.message || "Failed to load holidays.");

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

  }, [companyCode, yearKey, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const holidayDates = useMemo(
    () => getHolidayDates(holidays),
    [holidays]
  );

  const holidaySet = useMemo(
    () => toHolidaySet(holidayDates),
    [holidayDates]
  );

  const holidayMap = useMemo(
    () => buildHolidayMap(holidays),
    [holidays]
  );

  return {

    holidays,

    holidayDates,

    holidaySet,

    holidayMap,

    loading,

    error,

    reload,

  };

}

export default useHolidayDates;
