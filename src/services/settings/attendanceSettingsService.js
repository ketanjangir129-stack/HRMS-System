import { ref, get, set } from "firebase/database";
import { db } from "../../firebase/firebase";
import {
  normalizeWorkRules,
  toStoredWorkRules,
  validateWorkRules,
} from "../../utils/attendance/attendanceSettings";

/*
|--------------------------------------------------------------------------
| Attendance Settings Service
|--------------------------------------------------------------------------
| The only place that talks to the attendance settings branch of the database.
|
| companies/{companyCode}/attendance/settings
|
| A sibling of `records` and `requests` rather than a child of the company's
| `settings` branch, so everything the attendance module owns sits under one
| node: what happened, what was asked for, and the working day all three are
| read against.
|
| It is deliberately a leaf of its own beside them and not a field on either.
| `records` and `requests` are written all day by everybody; this is written
| rarely and by one person, so a read or a rule that covers the whole working
| day cannot pull a month of attendance with it.
|
| Company specific by construction: the code is in the path, so changing one
| company's working day cannot reach another's.
|
| Reads never write, and nothing here ever touches `records` or `requests` -
| the paths are siblings, not a subtree, so a write here cannot reach a day of
| attendance. A company that has never opened the Attendance Settings screen
| simply has no `settings` node beside them, and the read answers with the
| defaults from
| `attendanceSettings`; initialising the branch on a read would need write
| access from whoever happened to punch in first, which is exactly the access
| an employee should not have. Nothing has to be migrated for an existing
| company to keep working.
|
| Nothing here calculates anything. Whether a punch is Late, and how long a
| working day is, are questions asked of `attendanceSettings` and answered in
| the attendance module; this only stores and returns what was configured.
|--------------------------------------------------------------------------
*/

const attendanceSettingsPath = (companyCode) =>
  `companies/${companyCode}/attendance/settings`;

/*
|--------------------------------------------------------------------------
| Firebase Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in a toast.
*/

const describeError = (error, fallback) => {

  const code = String(
    error?.code || error?.message || ""
  ).toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to manage the attendance settings.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(
    describeError(error, fallback)
  );

};

/*
|--------------------------------------------------------------------------
| Get Attendance Settings
|--------------------------------------------------------------------------
| The company's working day, already merged over the defaults, so a caller
| never has to ask whether a company has configured anything.
|
| A missing company code and a missing node both answer with the defaults -
| there is nothing configured either way, and a caller that has to tell them
| apart is a caller that has grown a second job.
|
| The stored record is normalized on the way out as well as on the way in.
| Firebase is a shared database: a value can be edited in the console, and a
| read that trusts whatever it finds would hand a broken schedule to the punch
| that is about to be recorded against it.
|
| A read that actually fails still throws. The Settings screen has to be able
| to say it could not load; the attendance module, which must never refuse a
| punch over a configuration, catches it there and falls back to the defaults.
*/

export const getAttendanceSettings = async (companyCode) => {

  try {

    if (!companyCode) return normalizeWorkRules(null);

    const snapshot = await get(
      ref(db, attendanceSettingsPath(companyCode))
    );

    return normalizeWorkRules(
      snapshot.exists() ? snapshot.val() : null
    );

  }

  catch (error) {

    throw failWith(
      error,
      "Get Attendance Settings Error",
      "Failed to load the attendance settings."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Update Attendance Settings
|--------------------------------------------------------------------------
| The working day replaced outright, so the node always holds exactly the three
| keys the shape declares.
|
| `set` rather than `update`: a partial write would leave a stale end time
| beside a new start time, and half a schedule is worse than none because it
| still reads as configured.
|
| Validated here as well as on the screen. The service is what storage is
| reached through and it cannot depend on a form having checked first - a
| caller that skipped the panel would otherwise store a day that ends before it
| begins, and every punch after that would be measured against it.
|
| An invalid draft is refused rather than thrown: the caller is a form, and a
| message it can show beside the fields is more use to it than an exception it
| has to catch and translate. A Firebase failure is a different thing and does
| throw, because nobody should be told their settings were saved when they
| were not.
*/

export const updateAttendanceSettings = async (companyCode, settings) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const errors = validateWorkRules(settings);

    const [firstError] = Object.values(errors);

    if (firstError) {
      return {
        success: false,
        message: firstError,
        errors,
      };
    }

    const workRules = toStoredWorkRules(settings);

    await set(
      ref(db, attendanceSettingsPath(companyCode)),
      workRules
    );

    /*
    | Returned so the screen can hold what was actually written as its new
    | baseline without a second read.
    */
    return {
      success: true,
      settings: workRules,
    };

  }

  catch (error) {

    throw failWith(
      error,
      "Update Attendance Settings Error",
      "Failed to save the attendance settings. Please try again."
    );

  }

};
