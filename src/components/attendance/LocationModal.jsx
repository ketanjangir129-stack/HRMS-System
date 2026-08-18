import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiAlertTriangle,
  FiClock,
  FiCrosshair,
  FiExternalLink,
  FiHome,
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
  officeComparison,
} from "../../utils/attendance/attendanceLocation";
import useOfficeLocation from "../../hooks/useOfficeLocation";

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
| One map carries both punches. An OpenStreetMap embed takes a single marker
| per frame, which meant a map each and no way to see the pair against one
| another; Leaflet draws the tiles itself, so the two sit in the same view.
| The tiles are still OpenStreetMap's and there is still no API key.
|
| The link under each punch opens that one point in a full map for anybody
| who wants to pan away from it.
|--------------------------------------------------------------------------
*/

const isPlottable = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

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

/*
|--------------------------------------------------------------------------
| Punch Map
|--------------------------------------------------------------------------
| One map for the day, carrying whichever punches were recorded.
|
| Drawn rather than embedded. An iframe of OpenStreetMap's own page takes a
| single marker, so two punches meant two maps and no way to read one against
| the other; here the tiles are laid down directly and both markers go onto
| the same view.
|
| The markers are `divIcon`s - plain HTML, styled with the colours the two
| punches already carry elsewhere in this modal. Leaflet's default marker
| points at image files by relative path, which a bundler moves, and the
| usual fix is to re-import those images just to put them back where the
| library expects. Markup avoids the whole exchange and reads in the same
| language as the rest of the screen.
|--------------------------------------------------------------------------
*/

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Close enough to make out the building when there is only one point to show
const SINGLE_POINT_ZOOM = 16;

const markerIcon = (label, colour) =>
  L.divIcon({
    // Leaflet puts its own classes on the element otherwise, and they carry
    // a white box this pin does not want
    className: "",
    html:
      `<span style="display:flex;align-items:center;justify-content:center;` +
      `height:26px;width:34px;border-radius:9999px;background:${colour};` +
      `color:#fff;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;` +
      `box-shadow:0 1px 3px rgba(15,23,42,.4)">${label}</span>`,
    iconSize: [34, 26],
    // Centred on the coordinate rather than hanging below it, because the
    // point is the reading itself and not a pin stuck next to it
    iconAnchor: [17, 13],
  });

function PunchMap({ punchIn, punchOut }) {

  const containerRef = useRef(null);

  useEffect(() => {

    const points = [
      { location: punchIn, label: "In", colour: "#059669" },
      { location: punchOut, label: "Out", colour: "#d97706" },
    ].filter((point) => isPlottable(point.location));

    if (!points.length || !containerRef.current) return undefined;

    /*
    | Scroll wheel zoom is off: the map sits inside a scrolling modal body,
    | and a wheel over it would zoom the map instead of moving the panel.
    */
    const map = L.map(containerRef.current, { scrollWheelZoom: false });

    L.tileLayer(OSM_TILES, {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    points.forEach((point) => {

      L.marker(
        [point.location.latitude, point.location.longitude],
        { icon: markerIcon(point.label, point.colour) }
      )
        .addTo(map)
        .bindTooltip(point.label === "In" ? "Punch In" : "Punch Out");

    });

    if (points.length > 1) {

      // Padding keeps a marker sitting on the boundary off the very edge
      map.fitBounds(
        points.map((point) => [
          point.location.latitude,
          point.location.longitude,
        ]),
        { padding: [40, 40] }
      );

    } else {

      map.setView(
        [points[0].location.latitude, points[0].location.longitude],
        SINGLE_POINT_ZOOM
      );

    }

    /*
    | The modal animates in, so the container can still be settling when the
    | map measures it - which leaves Leaflet drawing tiles for a size that is
    | already wrong. One re-measure on the next frame covers it.
    */
    const settle = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(settle);
      map.remove();
    };

  }, [punchIn, punchOut]);

  // A day with nothing plottable gets no map rather than an empty grey frame
  if (!isPlottable(punchIn) && !isPlottable(punchOut)) return null;

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl border border-slate-200"
    />
  );

}

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

/*
| Outside is amber rather than red. A punch made away from the office is not
| a fault - a site visit, a client meeting and a delivery all look like this
| - so the tone says worth noticing, not worth answering for.
*/
const OFFICE_STYLES = {
  inside: "border-emerald-200 bg-emerald-50 text-emerald-700",
  outside: "border-amber-200 bg-amber-50 text-amber-700",
  unclear: "border-slate-200 bg-slate-50 text-slate-600",
};

const OFFICE_LABELS = {
  inside: "Inside office",
  outside: "Outside office",
  unclear: "Can't tell",
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

function PunchLocation({ icon, label, location, office }) {

  if (!isPlottable(location)) return null;

  const quality = locationQuality(location);

  /*
  | Null whenever there is nothing to compare against - no office configured,
  | or one that could not be read. The section below simply does not appear,
  | and everything above it is unchanged.
  */
  const againstOffice = officeComparison(location, office);

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

      {/*
      | Below the accuracy caveat, because it is a conclusion drawn from the
      | reading rather than another fact about it, and the caveat is what
      | says how much the conclusion is worth.
      */}
      {againstOffice && (
        <div
          className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
            OFFICE_STYLES[againstOffice.verdict]
          }`}
        >

          <FiHome className="mt-0.5 shrink-0" size={15} />

          <div className="min-w-0">

            <p className="text-xs font-semibold">
              {OFFICE_LABELS[againstOffice.verdict]}

              {/* Straight line, the same as everywhere else in this modal */}
              <span className="font-medium opacity-75">
                {" "}· {againstOffice.label} from the office
              </span>
            </p>

            {!againstOffice.weighed && (
              <p className="mt-0.5 text-xs font-medium opacity-90">
                GPS accuracy was not reported for this punch, so this could not
                be compared against the office boundary.
              </p>
            )}

            {againstOffice.verdict === "unclear" && (
              <p className="mt-0.5 text-xs font-medium opacity-90">
                The reported accuracy reaches past the office boundary, so
                neither answer would be honest.
              </p>
            )}

          </div>

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

  /*
  | Above the early return, because a hook cannot be called conditionally.
  | `open` is passed through as the switch instead: the read happens when
  | somebody asks to see a location, not on every attendance page that
  | merely mounts this component and returns null from it.
  */
  const { office } = useOfficeLocation(open);

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

          {/*
          | One map above both readings rather than one inside each: the pair
          | is only worth anything held against each other, and two frames
          | showing the same street from two angles said nothing.
          */}
          <PunchMap punchIn={punchIn} punchOut={punchOut} />

          <PunchLocation
            icon={<FiLogIn className="text-emerald-600" />}
            label="Punch In"
            location={punchIn}
            office={office}
          />

          <PunchLocation
            icon={<FiLogOut className="text-amber-600" />}
            label="Punch Out"
            location={punchOut}
            office={office}
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
