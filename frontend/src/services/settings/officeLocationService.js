import { ref, get, set, remove } from "firebase/database";
import { db } from "../../firebase/firebase";

/*
|--------------------------------------------------------------------------
| Office Location Service
|--------------------------------------------------------------------------
| The only place that talks to the office location branch of the database.
|
| companies/{companyCode}/settings/officeLocation
|
| A sibling of `rolesAccess` rather than a child of it: one is who may do
| what, the other is where the company sits. They are configured by the same
| person and they live under the same settings node, but neither reads the
| other.
|
| The record is a single point and a radius around it:
|
|   { latitude, longitude, radius }
|
| Company specific by construction - the code is in the path, so two
| companies never share a point, and a company with several offices is a
| later shape rather than a value squeezed into this one.
|
| Reads never write. A company that has never configured an office simply
| has no node, and `null` is what says so. Initialising the branch on a read
| would need write access from whoever happened to sign in first, which for
| HR and employee is exactly the access they should not have.
|
| Nothing here measures anything. Distance, inside or outside, geofencing -
| none of that lives at this layer; this only stores and returns the point
| the company configured.
|--------------------------------------------------------------------------
*/

const officeLocationPath = (companyCode) =>
  `companies/${companyCode}/settings/officeLocation`;

/*
| Metres. A radius has to be a real circle to mean anything, and one wide
| enough to cover a city would quietly make every punch fall inside it, so
| both ends are refused rather than stored.
|
| Exported because the editor validates the same range field by field, and a
| second copy of the numbers is a second place for them to drift.
*/
export const MIN_RADIUS_METRES = 10;
export const MAX_RADIUS_METRES = 10000;

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
    return "You do not have permission to manage the office location.";
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
| Sanitize Office Location
|--------------------------------------------------------------------------
| The three numbers, checked and returned as numbers, or null for anything
| that is not a usable point.
|
| A form hands over strings, so each value is converted before it is judged;
| an empty string converts to 0, which is a real coordinate, so blank fields
| are refused before the conversion rather than after it.
|
| Latitude and longitude are held to their actual ranges. A pair that is out
| of range is not a near miss to be clamped - it is a wrong value, and
| storing a clamped version of it would hide the mistake.
*/

export const sanitizeOfficeLocation = (location) => {

  if (!location) return null;

  const { latitude, longitude, radius } = location;

  // Refused before Number(), which would read "" and null as 0
  if (
    latitude === "" || latitude === null || latitude === undefined ||
    longitude === "" || longitude === null || longitude === undefined ||
    radius === "" || radius === null || radius === undefined
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const metres = Number(radius);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;

  if (
    !Number.isFinite(metres) ||
    metres < MIN_RADIUS_METRES ||
    metres > MAX_RADIUS_METRES
  ) {
    return null;
  }

  /*
  | Rebuilt rather than spread, so a caller that passes extra keys - a whole
  | form state, say - cannot push them into the database alongside the three
  | that belong there.
  */
  return {
    latitude: lat,
    longitude: lng,
    radius: metres,
  };

};

/*
|--------------------------------------------------------------------------
| Get Office Location
|--------------------------------------------------------------------------
| The company's configured point, or null.
|
| null covers three cases the caller treats the same way: no company code, no
| node, and a node whose numbers are unusable. In all three there is no point
| to work from, and a caller that has to tell them apart is a caller that has
| grown a second job.
|
| The stored record is sanitized on the way out as well as on the way in.
| Firebase is a shared database, not a private one: a value can be edited in
| the console, and a read that trusts whatever it finds would hand a broken
| point to everything downstream.
*/

export const getOfficeLocation = async (companyCode) => {

  try {

    if (!companyCode) return null;

    const snapshot = await get(
      ref(db, officeLocationPath(companyCode))
    );

    if (!snapshot.exists()) return null;

    return sanitizeOfficeLocation(snapshot.val());

  } catch (error) {

    throw failWith(
      error,
      "Get Office Location Error",
      "Failed to load the office location."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Save Office Location
|--------------------------------------------------------------------------
| The point replaced outright, so the node always holds exactly three keys.
|
| `set` rather than `update`: a partial write would leave a stale radius
| beside a new coordinate, and a half configured office is worse than none
| because it still reads as configured.
|
| An invalid point is refused here rather than thrown. The caller is a form,
| and a message it can show beside the fields is more use to it than an
| exception it has to catch and translate.
*/

export const saveOfficeLocation = async (companyCode, location) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const office = sanitizeOfficeLocation(location);

    if (!office) {
      return {
        success: false,
        message:
          `Enter a valid latitude (-90 to 90), longitude (-180 to 180) and radius (${MIN_RADIUS_METRES} to ${MAX_RADIUS_METRES} metres).`,
      };
    }

    await set(
      ref(db, officeLocationPath(companyCode)),
      office
    );

    return {
      success: true,
      officeLocation: office,
    };

  } catch (error) {

    throw failWith(
      error,
      "Save Office Location Error",
      "Failed to save the office location. Please try again."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Clear Office Location
|--------------------------------------------------------------------------
| The node removed, which returns the company to having no office configured.
|
| Removing it is not the same as storing zeroes: 0,0 is a real coordinate in
| the Atlantic, and a company that wants to stop using the feature must be
| able to say so without leaving a point behind that still reads as one.
*/

export const clearOfficeLocation = async (companyCode) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    await remove(
      ref(db, officeLocationPath(companyCode))
    );

    return { success: true };

  } catch (error) {

    throw failWith(
      error,
      "Clear Office Location Error",
      "Failed to remove the office location. Please try again."
    );

  }

};
