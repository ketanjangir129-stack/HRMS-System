import { useEffect, useState } from "react";

import useAuth from "./useAuth";
import { getAttendanceSettings } from "../services/settings/attendanceSettingsService";
import { DEFAULT_WORK_RULES } from "../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Settings
|--------------------------------------------------------------------------
| The company's configured working day, for anything on screen that has to
| describe it: the expected start time on the analytics card, and the full day
| the hours progress bar is measured against.
|
| This is the reading half only. Editing the working day goes through
| `useAttendanceSettingsEditor`, which holds a draft and writes it; a panel that
| used this one would have nothing to save.
|
| Nothing here decides anything either. Whether a punch was Late is settled by
| the service at the moment it is recorded and stored on the record, so a
| screen that shows a status is reading history rather than recomputing it -
| which is why changing the working day never rewrites the days already
| recorded under the old one.
|
| `enabled` is what keeps that cheap. A caller passes the condition the panel
| that needs it is drawn under, so the read happens for a page that is actually
| going to describe the working day and not for every attendance page that
| merely could.
|
| A failed read is not an error anybody needs to see. The settings are a
| refinement of what the page already shows, so if they cannot be loaded the
| defaults are used and everything else stays exactly as it was. The console
| still carries the reason for anybody debugging it.
|--------------------------------------------------------------------------
*/

const useAttendanceSettings = (enabled = true) => {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const [settings, setSettings] = useState(DEFAULT_WORK_RULES);

  const [pending, setPending] = useState(true);

  /*
  | Nothing is set synchronously here: every setState waits on the read, so the
  | effect subscribes rather than cascading a render the moment it runs.
  |
  | `active` covers the page being left mid read - a resolved promise landing
  | on an unmounted component would otherwise set state nobody is watching.
  */
  useEffect(() => {

    if (!enabled || !companyCode) return undefined;

    let active = true;

    getAttendanceSettings(companyCode)
      .then((configured) => {

        if (active) setSettings(configured);

      })
      .catch((loadError) => {

        console.error("Failed to load attendance settings:", loadError);

        if (active) setSettings(DEFAULT_WORK_RULES);

      })
      .finally(() => {

        if (active) setPending(false);

      });

    return () => {
      active = false;
    };

  }, [companyCode, enabled]);

  /*
  | A read that was never started is not a read in progress. Without this a
  | caller that is disabled, or a session with no company, would report loading
  | forever.
  */
  const loading = pending && enabled && Boolean(companyCode);

  return { settings, loading };

};

export default useAttendanceSettings;
