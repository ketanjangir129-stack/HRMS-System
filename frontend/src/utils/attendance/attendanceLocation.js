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

// Coordinates the map and the maths can both use. A record can carry a
// location node whose numbers never arrived, so this is checked every time.
const hasCoordinates = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

// Metres below a kilometre, kilometres above it.
const formatMetres = (metres) => {
  if (!Number.isFinite(metres)) return null;

  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/*
| Straight line metres between two points, by the haversine formula.
|
| Not exported: `officeComparison` below is the only caller, and a distance
| on its own is not something any screen shows. It stays a separate function
| because the formula is worth reading apart from what is done with it.
|
| Returns null rather than throwing for anything it cannot measure, because
| a half recorded day is normal: a punch in without a punch out, or a
| location node whose numbers never arrived.
*/
const distanceBetween = (from, to) => {
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
| A punch held against the company's configured office.
|
| The distance is the haversine above - `officeLocation` stores latitude and
| longitude under exactly those names, so the helper takes it unchanged.
|
| Only one of the two points was measured. The office is a point somebody
| typed into Settings - declared rather than observed - so it carries no
| error of its own, and the margin is the punch's accuracy alone. Radius is
| policy and accuracy is measurement; adding them together would blur a
| boundary the company chose with a number the device reported.
|
| Three verdicts, because two would have to lie about one of the cases:
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
