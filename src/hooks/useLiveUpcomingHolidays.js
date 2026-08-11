import { useCallback, useEffect, useMemo, useState } from "react";

import { subscribeHolidays } from "../services/holidayServices/holidayService";
import { getDateKey } from "../utils/attendance/attendanceDate";
import { UPCOMING_HOLIDAYS } from "../utils/holiday/holidayConstants";
import {
  getHolidayYear,
  getUpcomingHolidays,
} from "../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Upcoming Holidays (live)
|--------------------------------------------------------------------------
| The same list `useUpcomingHolidays` returns, kept open instead of read once.
|
| The dashboard is the screen that is left sitting on a second monitor all
| day, so a holiday declared this morning has to reach it on its own. A read
| that only runs on mount cannot do that, which is why this hook exists
| alongside the one shot version rather than replacing it: the holiday screen
| is opened to be read and closed again, and re-reading a year it is actively
| editing would fight its own refresh.
|
| Two years are listened to, not one. Late in December the year on screen has
| nothing left to show and the next holiday is in January, so the list would
| empty out exactly when it is most useful.
|
| The day itself is state as well. "Upcoming" is measured from today, and a
| tab left open across midnight would otherwise keep yesterday's date and go
| on calling a holiday that has passed "Today".
|--------------------------------------------------------------------------
*/

const DAY_MS = 24 * 60 * 60 * 1000;

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

/*
| What the listeners have delivered, stamped with the subscription it belongs
| to.
|
| The stamp is what lets a company or a year change without clearing anything
| first: a delivery from the old subscription no longer matches, so it is
| replaced rather than merged, and the card reads as loading again until the
| new listeners answer.
*/

const EMPTY_FEED = {
  key: "",
  byYear: {},
  waiting: [],
  error: "",
};

function useLiveUpcomingHolidays(
  companyCode,
  limit = UPCOMING_HOLIDAYS
) {

  const [today, setToday] = useState(() => getDateKey());

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

  const year = getHolidayYear(today);

  const [feed, setFeed] = useState(EMPTY_FEED);

  const [reloadKey, setReloadKey] = useState(0);

  // No company or no year means there is nothing to listen to at all.
  const subscriptionKey =
    companyCode && year
      ? `${companyCode}:${year}:${reloadKey}`
      : "";

  useEffect(() => {

    if (!subscriptionKey) return;

    const years = [year, year + 1];

    /*
    | Every update is folded onto the feed of this subscription. Anything
    | left from a previous one is dropped here rather than in a cleanup, so
    | the listeners are the only thing that ever writes state.
    */

    const applyUpdate = (updater) =>

      setFeed((current) =>
        updater(
          current.key === subscriptionKey
            ? current
            : {
                key: subscriptionKey,
                byYear: {},
                waiting: years,
                error: "",
              }
        )
      );

    const unsubscribes = years.map((listenYear) =>

      subscribeHolidays(
        companyCode,
        listenYear,

        (list) =>

          applyUpdate((current) => ({
            ...current,
            byYear: {
              ...current.byYear,
              [listenYear]: list,
            },
            // Answered, so it is no longer one of the years being waited on.
            waiting: current.waiting.filter(
              (pending) => pending !== listenYear
            ),
            error: "",
          })),

        (listenError) => {

          console.error(
            "Failed to load upcoming holidays:",
            listenError
          );

          applyUpdate((current) => ({
            ...current,
            waiting: [],
            error:
              listenError.message ||
              "Failed to load upcoming holidays.",
          }));

        }
      )

    );

    return () =>
      unsubscribes.forEach((unsubscribe) => unsubscribe());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionKey]);

  // A feed stamped with an older subscription is not this one's answer yet.
  const current =
    feed.key === subscriptionKey ? feed : null;

  const loading =
    Boolean(subscriptionKey) &&
    (!current || (current.waiting.length > 0 && !current.error));

  const error = current?.error || "";

  /*
  | Sorted and stamped with the days remaining, so a card can say "Tomorrow"
  | without working it out while it renders.
  */

  const upcoming = useMemo(
    () =>
      getUpcomingHolidays(
        Object.values(current?.byYear || {}).flat(),
        {
          from: today,
          limit,
        }
      ),
    [current, today, limit]
  );

  /*
  | A dropped connection is retried by Firebase on its own. This is for what
  | it will not recover from by itself, such as a permission denied that a
  | role change has since fixed.
  */

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {

    holidays: upcoming,

    loading,

    error,

    reload,

  };

}

export default useLiveUpcomingHolidays;
