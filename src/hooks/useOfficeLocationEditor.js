import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useAuth from "./useAuth";
import {
  clearOfficeLocation,
  getOfficeLocation,
  MAX_RADIUS_METRES,
  MIN_RADIUS_METRES,
  saveOfficeLocation,
} from "../services/settings/officeLocationService";

/*
|--------------------------------------------------------------------------
| Office Location Editor
|--------------------------------------------------------------------------
| The draft the company's office point is edited against on the Settings
| screen.
|
| Nothing is written while the fields are being typed in. Save is one write,
| Cancel puts the stored point back, and a half typed coordinate never
| reaches the database.
|
| The draft holds strings rather than numbers, because that is what an input
| gives back. They are converted once, by the service, on the way to storage
| - the same conversion that decides whether the point is storable at all.
|
| `save` and `clear` return `{ success, message }` rather than raising a
| toast, so the screen keeps saying what happened and the hook keeps deciding
| what is allowed - the same split `useRoleAccessEditor` uses.
|--------------------------------------------------------------------------
*/

const EMPTY_FORM = {
  latitude: "",
  longitude: "",
  radius: "",
};

/*
| The stored point as the form holds it. A configured company seeds three
| strings; a company with no office seeds three blanks, which is also what
| Clear leaves behind.
*/
const toForm = (office) =>
  office
    ? {
        latitude: String(office.latitude),
        longitude: String(office.longitude),
        radius: String(office.radius),
      }
    : EMPTY_FORM;

/*
|--------------------------------------------------------------------------
| Field Errors
|--------------------------------------------------------------------------
| The same ranges the service enforces, checked one field at a time.
|
| The service answers with a single null for the whole point, which is right
| for storage and useless to a form: somebody who typed a longitude of 200
| needs to be told which box is wrong, not that the point is invalid.
|
| The bounds themselves are imported rather than repeated, so the form and
| the service can never disagree about what is storable.
*/

const FIELDS = [
  { key: "latitude", label: "Latitude", min: -90, max: 90 },
  { key: "longitude", label: "Longitude", min: -180, max: 180 },
  {
    key: "radius",
    label: "Radius",
    min: MIN_RADIUS_METRES,
    max: MAX_RADIUS_METRES,
  },
];

const fieldErrors = (draft) =>
  FIELDS.reduce((errors, field) => {

    const raw = draft?.[field.key];

    // Checked before Number(), which reads "" and null as 0 - a real
    // coordinate, and not one anybody typed
    if (raw === "" || raw === null || raw === undefined) {
      errors[field.key] = `${field.label} is required.`;
      return errors;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      errors[field.key] = `${field.label} must be a number.`;
      return errors;
    }

    /*
    | Reported rather than clamped. A longitude of 200 is a typo, and storing
    | 180 in its place would hide the mistake behind a point that looks
    | deliberate.
    */
    if (value < field.min || value > field.max) {
      errors[field.key] =
        `${field.label} must be between ${field.min} and ${field.max}.`;
    }

    return errors;

  }, {});

const useOfficeLocationEditor = () => {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const [saved, setSaved] = useState(null);

  const [draft, setDraft] = useState(EMPTY_FORM);

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
  | The stored point, once, when the panel mounts.
  |
  | Nothing is set synchronously here: every setState waits on the read, so
  | the effect subscribes rather than cascading a render the moment it runs.
  |
  | `active` covers the panel closing mid read - a resolved promise landing on
  | an unmounted component would otherwise set state nobody is watching.
  */
  useEffect(() => {

    if (!companyCode) return undefined;

    let active = true;

    getOfficeLocation(companyCode)
      .then((office) => {

        if (!active) return;

        setSaved(office);
        setDraft(toForm(office));
        setError("");

      })
      .catch((loadError) => {

        if (!active) return;

        console.error("Failed to load office location:", loadError);

        setError(
          loadError?.message || "Failed to load the office location."
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
  | the panel would sit on a skeleton forever rather than showing an empty
  | form it can do nothing with.
  */
  const loading = pending && Boolean(companyCode);

  const savedForm = useMemo(() => toForm(saved), [saved]);

  const dirty = useMemo(
    () =>
      FIELDS.some(
        (field) => draft[field.key] !== savedForm[field.key]
      ),
    [draft, savedForm]
  );

  const configured = Boolean(saved);

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
  | Validated here for the message, and again by the service for the write.
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

    const invalid = fieldErrors(draft);

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

      const result = await saveOfficeLocation(companyCode, draft);

      if (!result?.success) {

        return {
          success: false,
          message:
            result?.message ||
            "Failed to save the office location. Please try again.",
        };

      }

      /*
      | Seeded from what the service actually stored rather than from the
      | draft, so the boxes settle on the numbers in the database - "26.9124"
      | typed as " 26.9124 " comes back as the value that was written.
      */
      setSaved(result.officeLocation);
      setDraft(toForm(result.officeLocation));
      setErrors({});
      setError("");

      return {
        success: true,
        message: "Office location saved successfully.",
      };

    } catch (saveError) {

      console.error("Failed to save office location:", saveError);

      return {
        success: false,
        message:
          saveError?.message ||
          "Failed to save the office location. Please try again.",
      };

    } finally {

      savingRef.current = false;

      setSaving(false);

    }

  }, [companyCode, draft]);

  /*
  |--------------------------------------------------------------------------
  | Clear
  |--------------------------------------------------------------------------
  | The stored point removed, which is not something Save can express: a blank
  | form is invalid, so "no office" has to be said outright rather than by
  | emptying the boxes and saving them.
  */

  const clear = useCallback(async () => {

    if (savingRef.current) {
      return { success: false, message: "" };
    }

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    savingRef.current = true;

    setSaving(true);

    try {

      const result = await clearOfficeLocation(companyCode);

      if (!result?.success) {

        return {
          success: false,
          message:
            result?.message ||
            "Failed to remove the office location. Please try again.",
        };

      }

      setSaved(null);
      setDraft(EMPTY_FORM);
      setErrors({});
      setError("");

      return {
        success: true,
        message: "Office location removed.",
      };

    } catch (clearError) {

      console.error("Failed to clear office location:", clearError);

      return {
        success: false,
        message:
          clearError?.message ||
          "Failed to remove the office location. Please try again.",
      };

    } finally {

      savingRef.current = false;

      setSaving(false);

    }

  }, [companyCode]);

  const reload = useCallback(() => {

    setPending(true);
    setReloadKey((key) => key + 1);

  }, []);

  return {

    draft,

    errors,

    dirty,

    configured,

    loading,

    error,

    saving,

    setField,

    cancel,

    save,

    clear,

    reload,

  };

};

export default useOfficeLocationEditor;
