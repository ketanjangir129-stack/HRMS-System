import {
  FiAlertTriangle,
  FiClock,
  FiCrosshair,
  FiExternalLink,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiNavigation,
  FiX,
} from "react-icons/fi";
import { formatDateTime } from "../../utils/attendance/attendanceDate";
import {
  locationQuality,
  movementBetween,
} from "../../utils/attendance/attendanceLocation";

/*
|--------------------------------------------------------------------------
| Punch Location
|--------------------------------------------------------------------------
| Where a punch was made, read only.
|
| Both punches are shown together rather than one at a time: a row can carry
| a punch in location, a punch out location or both, and which of them exists
| is not something the table can ask before the modal is open.
|
| The map is an OpenStreetMap embed, so no map package and no API key are
| needed. The link below it opens the same point in a full map for anybody
| who wants to pan away from it.
|--------------------------------------------------------------------------
*/

/*
| Roughly 200m around the point, which is close enough to see the building
| and wide enough that a poor fix still lands inside the frame.
*/

const MAP_DELTA = 0.002;

const isPlottable = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

const embedUrl = ({ latitude, longitude }) => {

  const bbox = [
    longitude - MAP_DELTA,
    latitude - MAP_DELTA,
    longitude + MAP_DELTA,
    latitude + MAP_DELTA,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

};

const mapsUrl = ({ latitude, longitude }) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

/*
| Both punches in one view, which is the one thing the two embeds above
| cannot do: an OpenStreetMap embed takes a single marker, so seeing the
| pair together means handing them to a map that accepts two.
|
| Punch in leads, punch out follows, so the pair reads in the order the day
| happened rather than in the order the numbers were stored.
*/
const directionsUrl = (from, to) =>
  `https://www.google.com/maps/dir/${from.latitude},${from.longitude}/${to.latitude},${to.longitude}`;

function DetailItem({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value || "--"}
      </p>

    </div>
  );
}

/*
| The tone carries the reading on its own, so the badge does not have to
| spell out what Poor means next to a number nobody reads in metres.
*/
const QUALITY_STYLES = {
  excellent: "bg-emerald-50 text-emerald-700",
  good: "bg-blue-50 text-blue-700",
  fair: "bg-amber-50 text-amber-700",
  poor: "bg-red-50 text-red-700",
  unknown: "bg-slate-100 text-slate-600",
};

function QualityBadge({ quality }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        QUALITY_STYLES[quality.level]
      }`}
    >
      {quality.label}

      {/* Missing on an Unknown reading - there is no radius to quote */}
      {quality.accuracyLabel && (
        <span className="font-medium opacity-75">
          · {quality.accuracyLabel}
        </span>
      )}
    </span>
  );
}

function PunchLocation({ icon, label, location }) {

  if (!isPlottable(location)) return null;

  const quality = locationQuality(location);

  return (
    <section>

      {/*
      | The badge sits with the heading rather than beside the accuracy tile:
      | it qualifies the whole reading, map included, not just that one
      | number.
      */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {label}
        </h3>

        <QualityBadge quality={quality} />

      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <iframe
          title={`${label} location map`}
          src={embedUrl(location)}
          className="block h-52 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">

        <DetailItem
          icon={<FiMapPin />}
          label="Latitude"
          value={location.latitude.toFixed(6)}
        />

        <DetailItem
          icon={<FiMapPin />}
          label="Longitude"
          value={location.longitude.toFixed(6)}
        />

        <DetailItem
          icon={<FiCrosshair />}
          label="Accuracy"
          value={
            Number.isFinite(location.accuracy)
              ? `± ${Math.round(location.accuracy)} m`
              : "--"
          }
        />

        <DetailItem
          icon={<FiClock />}
          label="Captured"
          value={formatDateTime(location.capturedAt)}
        />

      </div>

      {/*
      | Amber rather than red. A loose fix is a caveat on what the reading
      | can be asked to show, not a fault in the day or in the person - a
      | laptop on office Wi-Fi reports kilometres as a matter of course.
      */}
      {quality.warn && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">

          <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={15} />

          <p className="text-xs font-medium text-amber-700">
            {quality.level === "unknown"
              ? "The device did not report an accuracy value, so how precise this coordinate is cannot be assessed."
              : `This coordinate narrows the position to an area of roughly ${quality.accuracyLabel.replace(
                  "± ",
                  ""
                )}. It cannot confirm the exact physical location.`}
          </p>

        </div>
      )}

      <a
        href={mapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
      >
        <FiExternalLink />
        Open in Google Maps
      </a>

    </section>
  );

}

function LocationModal({ open, record, onClose }) {

  if (!open || !record) return null;

  const punchIn = record.location?.punchIn;
  const punchOut = record.location?.punchOut;

  const hasAny = isPlottable(punchIn) || isPlottable(punchOut);

  /*
  | Only with two readings to hold against each other. movementBetween
  | returns null for anything it cannot measure, so a half recorded day and
  | a location node whose numbers never arrived both simply leave the
  | section out.
  */
  const movement = movementBetween(punchIn, punchOut);

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`,
    | the same shape every other modal in the module uses.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiMapPin size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="text-lg font-semibold text-slate-900">
                Punch Location
              </h2>

              <p className="truncate text-sm text-slate-500">
                {record.employeeName || record.employeeId}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">

          <PunchLocation
            icon={<FiLogIn className="text-emerald-600" />}
            label="Punch In"
            location={punchIn}
          />

          <PunchLocation
            icon={<FiLogOut className="text-amber-600" />}
            label="Punch Out"
            location={punchOut}
          />

          {/*
          | Between the two punches rather than inside either, because it is
          | the one thing neither reading can say on its own.
          |
          | The distance is a straight line between two reported points. It
          | is not a route, and it is not a claim about where anybody went -
          | the wording stays on what was measured.
          */}
          {movement && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">

              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FiNavigation className="text-slate-500" size={15} />
                Movement
              </h3>

              <p className="mt-1.5 text-base font-semibold text-slate-800">
                {movement.withinMargin
                  ? "Within accuracy margin"
                  : `~${movement.label}`}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {movement.withinMargin
                  ? "The difference between the two reported locations is smaller than the location uncertainty."
                  : movement.withinMargin === null
                    ? "Straight-line distance between the two reported coordinates. Accuracy was not reported for both punches, so it cannot be weighed against the location uncertainty."
                    : "Straight-line distance between the two reported coordinates, not travel distance."}
              </p>

              {/*
              | Guarded by the section itself: movement is only ever set when
              | both readings carry usable coordinates, which is the same
              | condition this link needs. Same shape as the single point
              | link under each map, so the two read as one family.
              */}
              <a
                href={directionsUrl(punchIn, punchOut)}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <FiExternalLink />
                Compare both locations
              </a>

            </section>
          )}

          {/*
          | A record whose coordinates are unreadable rather than absent: the
          | table offers the button on the location node existing, not on it
          | being plottable.
          */}
          {!hasAny && (
            <p className="text-sm text-slate-500">
              No location was recorded for this day.
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-4 sm:px-6 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );

}

export default LocationModal;
