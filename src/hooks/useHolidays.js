import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createHoliday as createHolidayRecord,
  deleteHoliday as deleteHolidayRecord,
  getHolidays,
  updateHoliday as updateHolidayRecord,
} from "../services/holidayServices/holidayService";
import {
  getHolidayYear,
  sortHolidays,
} from "../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holidays
|--------------------------------------------------------------------------
| Every holiday of one year, kept in date order.
|
| Holidays are stored per year, so the year is the only thing the hook loads
| by: switching it in the header reloads that year and nothing else.
|
| A mutation bumps the reload key instead of patching state inline, so the
| list is refreshed from one place and a holiday added by somebody else is
| picked up at the same time.
|--------------------------------------------------------------------------
*/

function useHolidays(companyCode, year) {

  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Load Holidays
  |--------------------------------------------------------------------------
  | `cancelled` guards every state write, so a year switched while a read is
  | still in flight cannot be overwritten by the answer to the old one.
  */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      if (!companyCode || !year) {
        setHolidays([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const data = await getHolidays(companyCode, year);

        if (cancelled) return;

        setHolidays(data);

        setError("");

      } catch (loadError) {

        if (cancelled) return;

        console.error("Failed to load holidays:", loadError);

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

  }, [companyCode, year, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  /*
  | Date order is the order a holiday list is read in, so it is applied once
  | here rather than in each panel that renders the list.
  */

  const sorted = useMemo(
    () => sortHolidays(holidays),
    [holidays]
  );

  /*
  |--------------------------------------------------------------------------
  | Create Holiday
  |--------------------------------------------------------------------------
  | A holiday saved for a different year than the one on screen is written to
  | that year and is not part of this list, so the reload is skipped: there is
  | nothing here to refresh, and the year selector will fetch it when it is
  | switched to.
  */

  const createHoliday = async (holiday) => {

    const result = await createHolidayRecord(
      companyCode,
      holiday
    );

    if (result?.success && Number(result.year) === Number(year)) {
      reload();
    }

    return result;

  };

  /*
  |--------------------------------------------------------------------------
  | Update Holiday
  |--------------------------------------------------------------------------
  | The year the record currently lives under is derived from the holiday
  | being edited, not from the year on screen: they are the same today, but
  | reading it from the record is what keeps a move to another year correct.
  */

  const updateHoliday = async (holiday, updates) => {

    const currentYear =
      getHolidayYear(holiday?.date) || year;

    const result = await updateHolidayRecord(
      companyCode,
      currentYear,
      holiday?.holidayId,
      updates
    );

    if (result?.success) {
      reload();
    }

    return result;

  };

  /*
  |--------------------------------------------------------------------------
  | Delete Holiday
  |--------------------------------------------------------------------------
  */

  const deleteHoliday = async (holiday) => {

    const currentYear =
      getHolidayYear(holiday?.date) || year;

    const result = await deleteHolidayRecord(
      companyCode,
      currentYear,
      holiday?.holidayId
    );

    if (result?.success) {
      reload();
    }

    return result;

  };

  return {

    holidays: sorted,

    loading,

    error,

    reload,

    createHoliday,

    updateHoliday,

    deleteHoliday,

  };

}

export default useHolidays;
