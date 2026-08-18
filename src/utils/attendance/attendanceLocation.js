/*
|--------------------------------------------------------------------------
| Punch Location
|--------------------------------------------------------------------------
| The browser's position, read once, for a punch that is about to be written.
|
| A punch is never held up by it. Location is evidence of where a punch was
| made, not permission to make one: a denied prompt, a device without a fix
| and a browser that never answers all resolve to null, and the punch is
| written without it.
|--------------------------------------------------------------------------
*/

const LOCATION_TIMEOUT = 10 * 1000;

export const getPunchLocation = () =>
  new Promise((resolve) => {

    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(

      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          // Firebase rejects undefined, so the field is always a value.
          accuracy: coords.accuracy ?? null,
          capturedAt: Date.now(),
        });
      },

      (locationError) => {
        console.warn("Punch location unavailable:", locationError?.message);
        resolve(null);
      },

      { enableHighAccuracy: true, timeout: LOCATION_TIMEOUT, maximumAge: 0 }

    );

  });

/*
|--------------------------------------------------------------------------
| Reading a stored location
|--------------------------------------------------------------------------
| Everything below only interprets what was already written. Nothing here
| reads or writes Firebase, and nothing is stored: the values are derived
| again on every render from latitude, longitude and accuracy.
|
| A note on what accuracy means. The browser reports it as the radius, in
| metres, it is roughly 68% confident the device sits inside. It says how
| tightly the position was pinned down - not that anybody was there. A punch
| location is evidence, never proof, and the wording all the way through
| stays on that side of the line.
|--------------------------------------------------------------------------
*/

const EARTH_RADIUS_METRES = 6371000;

/*
| Ordered narrowest first, so the first row a reading fits is its level.
| Anything past the last row is Poor - typically a Wi-Fi or IP derived fix
| rather than a satellite one, which is ordinary on a desktop.
*/
const QUALITY_LEVELS = [
  { level: "excellent", label: "Excellent", limit: 20 },
  { level: "good", label: "Good", limit: 50 },
  { level: "fair", label: "Fair", limit: 100 },
];

const POOR_LEVEL = { level: "poor", label: "Poor" };

// Coordinates the map and the maths can both use. A record can carry a
// location node whose numbers never arrived, so this is checked every time.
const hasCoordinates = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

// Metres below a kilometre, kilometres above it - the same reading is used
// for an accuracy radius and for a distance, so both stay in one place.
const formatMetres = (metres) => {
  if (!Number.isFinite(metres)) return null;

  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/*
| How tightly a punch was pinned down.
|
| accuracy is optional in storage - it is written as null when the device
| does not report one - so an unreadable value is a real case rather than a
| guard, and it resolves to Unknown instead of to a level it did not earn.
*/
export const locationQuality = (location) => {
  const accuracy = location?.accuracy;

  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return {
      level: "unknown",
      label: "Unknown",
      accuracy: null,
      accuracyLabel: null,
      // Not knowing how precise a reading is deserves saying, the same as
      // knowing it is loose.
      warn: true,
    };
  }

  const match =
    QUALITY_LEVELS.find((quality) => accuracy <= quality.limit) || POOR_LEVEL;

  return {
    level: match.level,
    label: match.label,
    accuracy,
    accuracyLabel: `± ${formatMetres(accuracy)}`,
    warn: match.level === "poor",
  };
};

/*
| Straight line metres between two punches, by the haversine formula.
|
| Returns null rather than throwing for anything it cannot measure, because
| a half recorded day is normal: a punch in without a punch out, or a
| location node whose numbers never arrived.
*/
export const distanceBetween = (from, to) => {
  if (!hasCoordinates(from) || !hasCoordinates(to)) return null;

  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;

  // Math.min guards the square root drifting a hair above 1 on two points
  // that are effectively the same, which would hand asin a NaN.
  const metres =
    2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));

  return Number.isFinite(metres) ? metres : null;
};

/*
| The distance, and whether it is large enough to mean anything.
|
| Two readings each loose to a kilometre can sit a few hundred metres apart
| without the device having gone anywhere - the gap is the uncertainty, not
| a journey. So the distance is weighed against both accuracy radii added
| together, and below that it is reported as margin rather than as movement.
|
| withinMargin is deliberately three valued. true and false are answers;
| null means the comparison could not be made at all, because one of the
| readings never carried an accuracy to compare against. Saying so is more
| honest than treating a missing radius as a radius of zero, which would
| turn every old record into confident movement.
*/
export const movementBetween = (from, to) => {
  const metres = distanceBetween(from, to);

  if (metres === null) return null;

  const fromAccuracy = Number.isFinite(from?.accuracy) ? from.accuracy : null;
  const toAccuracy = Number.isFinite(to?.accuracy) ? to.accuracy : null;

  const comparable = fromAccuracy !== null && toAccuracy !== null;
  const margin = comparable ? fromAccuracy + toAccuracy : null;

  return {
    metres,
    label: formatMetres(metres),
    margin,
    marginLabel: comparable ? formatMetres(margin) : null,
    withinMargin: comparable ? metres <= margin : null,
  };
};

/*
| A punch held against the company's configured office.
|
| The distance is the same haversine the two punches are measured with -
| `officeLocation` stores latitude and longitude under exactly those names,
| so the existing helper takes it unchanged.
|
| What differs is the uncertainty. `movementBetween` adds two accuracy radii
| because both of its points were measured; here only one was. The office is
| a point somebody typed into Settings - declared rather than observed - so
| it carries no error of its own, and the margin is the punch's accuracy
| alone. Radius is policy and accuracy is measurement; adding them together
| would blur a boundary the company chose with a number the device reported.
|
| Three verdicts, for the same reason `withinMargin` has three values:
|
|   inside   the accuracy circle fits entirely within the radius
|   outside  the accuracy circle falls entirely beyond it
|   unclear  the circle straddles the boundary, and neither answer is honest
|
| A loose fix does not mean unclear on its own. A punch fifty kilometres out
| with a two kilometre error is still plainly outside - the uncertainty only
| decides the verdict when it reaches as far as the boundary does.
|
| `weighed` is false when the punch carries no accuracy. The verdict is then
| the bare comparison, which is worth showing and worth labelling as
| something that could not be weighed rather than passing off as certain.
*/
export const officeComparison = (punch, office) => {

  const metres = distanceBetween(punch, office);

  if (metres === null) return null;

  // Sanitized on the way out of storage, but this is read on every render
  // and a radius that never arrived is not a boundary
  const radius = Number.isFinite(office?.radius) ? office.radius : null;

  if (radius === null) return null;

  const accuracy = Number.isFinite(punch?.accuracy) ? punch.accuracy : null;

  const verdict =
    accuracy === null
      ? metres <= radius
        ? "inside"
        : "outside"
      : metres + accuracy <= radius
        ? "inside"
        : metres - accuracy > radius
          ? "outside"
          : "unclear";

  return {
    metres,
    label: formatMetres(metres),
    radius,
    accuracy,
    verdict,
    weighed: accuracy !== null,
  };

};
