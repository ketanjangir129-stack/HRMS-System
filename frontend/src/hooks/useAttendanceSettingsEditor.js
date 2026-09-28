import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useAuth from "./useAuth";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../services/settings/attendanceSettingsService";
import {
  isSameWorkRules,
  validateWorkRules,
} from "../utils/attendance/attendanceSettings";
import { DEFAULT_WORK_RULES } from "../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Settings Editor
|--------------------------------------------------------------------------
| The draft the company's working day is edited against on the Attendance
| Settings screen.
|
| Nothing is written while the fields are being typed in. Save is one write,
| Cancel puts the stored schedule back, and a half typed time never reaches the
| database.
|
| The draft holds strings, because that is what an input gives back - a time
| field gives "HH:mm" and the grace period gives digits. They are converted
| once, by the service, on the way to storage.
|
| There is no Clear. An office location can genuinely be "not configured";
| a working day cannot, because every punch has to be judged against something.
| Going back to 09:30 to 18:30 is typing those times, which is a save like any
| other.
|
| `save` returns `{ success, message }` rather than raising a toast, so the
| screen keeps saying what happened and the hook keeps deciding what is allowed
| - the same split `useOfficeLocationEditor` uses.
|--------------------------------------------------------------------------
*/

/*
| The stored schedule as the form holds it. The grace period is a number in the
| record and a string in the box, so it is converted here rather than in three
| places on the screen.
*/

const toForm = (settings) => ({
  startTime: settings?.startTime ?? DEFAULT_WORK_RULES.startTime,
  endTime: settings?.endTime ?? DEFAULT_WORK_RULES.endTime,
  gracePeriodMinutes: String(
    settings?.gracePeriodMinutes ?? DEFAULT_WORK_RULES.gracePeriodMinutes
  ),
});

const useAttendanceSettingsEditor = () => {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const [saved, setSaved] = useState(DEFAULT_WORK_RULES);

  const [draft, setDraft] = useState(() => toForm(DEFAULT_WORK_RULES));

  const [errors, setErrors] = useState({});

  const [pending, setPending] = useState(true);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  // Forces the read to run again after nothing else has changed
  const [reloadKey, setReloadKey] = useState(0);

  /*
  | `saving` is state, so two clicks landing in the same tick would both read
  | it as false and both write. The ref is what actually blocks the second.
  */
  const savingRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Load
  |--------------------------------------------------------------------------
  | The stored schedule, once, when the panel mounts. A company that has never
  | configured one is answered with the defaults by the service, so the form
  | opens on a working schedule rather than on empty boxes.
  |
  | Nothing is set synchronously here: every setState waits on the read, so the
  | effect subscribes rather than cascading a render the moment it runs.
  |
  | `active` covers the page being left mid read - a resolved promise landing
  | on an unmounted component would otherwise set state nobody is watching.
  */
  useEffect(() => {

    if (!companyCode) return undefined;

    let active = true;

    getAttendanceSettings(companyCode)
      .then((settings) => {

        if (!active) return;

        setSaved(settings);
        setDraft(toForm(settings));
        setError("");

      })
      .catch((loadError) => {

        if (!active) return;

        console.error("Failed to load attendance settings:", loadError);

        setError(
          loadError?.message || "Failed to load the attendance settings."
        );

      })
      .finally(() => {

        if (active) setPending(false);

      });

    return () => {
      active = false;
    };

  }, [companyCode, reloadKey]);

  /*
  | A company code that never arrives is not a load in progress. Without this
  | the panel would sit on a skeleton forever rather than showing a form it can
  | do nothing with.
  */
  const loading = pending && Boolean(companyCode);

  const savedForm = useMemo(() => toForm(saved), [saved]);

  /*
  | What keeps an unchanged form from writing. Save is held disabled until
  | something actually differs from what is stored, so opening the panel and
  | pressing Save cannot cost a write.
  */
  const dirty = useMemo(
    () => !isSameWorkRules(draft, savedForm),
    [draft, savedForm]
  );

  // One field's error goes as soon as it is edited, so a corrected box stops
  // being red without waiting for the next save
  const setField = useCallback((key, value) => {

    setDraft((current) => ({ ...current, [key]: value }));

    setErrors((current) =>
      current[key] ? { ...current, [key]: "" } : current
    );

  }, []);

  const cancel = useCallback(() => {

    setDraft(savedForm);
    setErrors({});

  }, [savedForm]);

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  | Validated here for the messages, and again by the service for the write.
  | The second pass is not redundant: the service is what storage is reached
  | through, and it cannot depend on a form having checked first.
  */

  const save = useCallback(async () => {

    if (savingRef.current) {
      return { success: false, message: "" };
    }

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const invalid = validateWorkRules(draft);

    if (Object.keys(invalid).length > 0) {

      setErrors(invalid);

      return {
        success: false,
        message: "Check the highlighted fields.",
      };

    }

    savingRef.current = true;

    setSaving(true);

    try {

      const result = await updateAttendanceSettings(companyCode, draft);

      if (!result?.success) {

        // The service validates too, and its errors are keyed the same way.
        if (result?.errors) setErrors(result.errors);

        return {
          success: false,
          message:
            result?.message ||
            "Failed to save the attendance settings. Please try again.",
        };

      }

      /*
      | Seeded from what the service actually stored rather than from the
      | draft, so the boxes settle on the values in the database - "015" typed
      | into the grace period comes back as the 15 that was written.
      */
      setSaved(result.settings);
      setDraft(toForm(result.settings));
      setErrors({});
      setError("");

      return {
        success: true,
        message: "Attendance settings saved successfully.",
      };

    } catch (saveError) {

      console.error("Failed to save attendance settings:", saveError);

      return {
        success: false,
        message:
          saveError?.message ||
          "Failed to save the attendance settings. Please try again.",
      };

    } finally {

      savingRef.current = false;

      setSaving(false);

    }

  }, [companyCode, draft]);

  const reload = useCallback(() => {

    setPending(true);
    setReloadKey((key) => key + 1);

  }, []);

  return {

    /*
    | What is actually stored, for anything that has to state the company's
    | working day rather than the one being typed. The draft answers "what am I
    | about to save"; this answers "what is the company on".
    */
    saved,

    draft,

    errors,

    dirty,

    loading,

    error,

    saving,

    setField,

    cancel,

    save,

    reload,

  };

};

export default useAttendanceSettingsEditor;
