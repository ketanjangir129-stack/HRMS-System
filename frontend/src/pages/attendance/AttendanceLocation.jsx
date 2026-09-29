import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiHome,
  FiLogIn,
  FiLogOut,
  FiMapPin,
} from "react-icons/fi";
import { useParams } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useOfficeLocation from "../../hooks/useOfficeLocation";
import { subscribeToEmployeeDay } from "../../services/attendanceServices/attendanceService";
import { formatDate, formatTime } from "../../utils/attendance/attendanceDate";
import { officeComparison } from "../../utils/attendance/attendanceLocation";
import { getEmployeeDetails } from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Punch Location
|--------------------------------------------------------------------------
| Where a punch was made, read only.
|
| A page rather than the modal it used to be. The reason is the map: a
| location is read by panning and zooming around it, and a dialog sized to
| sit inside a table row gave a 256px frame with a scrolling panel behind it,
| which is the one shape a map cannot be read in. A page has the whole width
| to give it, and a URL - so a day's location can be linked to and opened
| again, which a dialog that only existed while a row was clicked could not.
|
| Both punches are shown together rather than one at a time: a day can carry
| a punch in location, a punch out location or both, and which of them exists
| is not something the table can ask before the page is open.
|
| One map carries both punches. An OpenStreetMap embed takes a single marker
| per frame, which meant a map each and no way to see the pair against one
| another; Leaflet draws the tiles itself, so the two sit in the same view.
| The tiles are still OpenStreetMap's and there is still no API key.
|
| The map below is the whole of it - there is no way out to a third party
| one. Panning and zooming are what the reader came to do and the map on this
| page does both, so a link that opened the same two points somewhere else
| only sent them off the screen that was already answering them.
|
| Nothing here records anything. The coordinates were written by the punch
| that made them and this only reads them back.
|--------------------------------------------------------------------------
*/

const isPlottable = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

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
| punches already carry elsewhere on this page. Leaflet's default marker
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

/*
| Slate, deliberately outside the green and amber the two punches use. The
| office is not a third reading to be compared with them - it is the ground
| they are read against, so it should not look like one of them.
*/
const OFFICE_COLOUR = "#475569";

/*
| Named rather than a bare pin, because a building on a map is not self
| explanatory next to two pins that already carry words.
|
| Shaped as a pin standing above the point rather than a pill centred on it,
| which the two punches use. Two reasons, and they are the same reason twice:
|
|   The circle is drawn from this coordinate outwards, and a label sitting on
|   top of the centre covers the very thing it is labelling. A radius small
|   enough to fit inside the label is a radius nobody can see.
|
|   An office is frequently the place a punch was made, so the office point
|   and the punch point are often the same point. Centred on it, the two
|   labels would land on each other; standing above it, only the stem meets
|   the punch pill and both stay readable.
|
| So the label floats clear, the stem reaches down, and a small dot marks the
| coordinate itself - the part the radius is measured from.
*/
const officeIcon = () =>
  L.divIcon({
    className: "",
    html:
      `<div style="display:flex;flex-direction:column;align-items:center">` +

      `<span style="display:flex;align-items:center;gap:4px;height:24px;` +
      `padding:0 9px;border-radius:9999px;background:${OFFICE_COLOUR};` +
      `color:#fff;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;` +
      `white-space:nowrap;box-shadow:0 1px 3px rgba(15,23,42,.4)">` +
      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M3 21h18"/>` +
      `<path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/>` +
      `<path d="M15 21V10h4a1 1 0 0 1 1 1v10"/>` +
      `<path d="M9 8h2"/><path d="M9 12h2"/>` +
      `</svg>Office</span>` +

      `<span style="width:2px;height:10px;background:${OFFICE_COLOUR}"></span>` +

      // A ring by shadow rather than by border, so the dot measures 9px
      // whatever box-sizing the page has set on it
      `<span style="width:9px;height:9px;border-radius:9999px;` +
      `background:${OFFICE_COLOUR};box-shadow:0 0 0 2px #fff,` +
      `0 1px 2px rgba(15,23,42,.4)"></span>` +

      `</div>`,
    iconSize: [76, 43],
    // Bottom centre, so the dot lands on the coordinate and everything else
    // stacks up above it
    iconAnchor: [38, 43],
  });

/*
| The configured radius, drawn. It is a boundary somebody typed into
| Settings, not a measurement, and nothing on this screen enforces it - so it
| stays context under the punches rather than a verdict about them.
|
| Subtle, but not to the point of being absent. The two punches set the map's
| bounds, and a pair of them kilometres apart leaves a couple of hundred
| metres of radius only tens of pixels wide - at which size a hairline at 60%
| over a city map is nothing at all. So the edge carries the weight: dashed,
| which also reads as a declared limit rather than something measured, and
| solid enough to follow at small sizes. The fill stays light, because it
| covers streets that still have to be legible underneath it.
|
| `interactive: false` keeps the circle out of the way of the pins it sits
| beneath: a shape this large would otherwise take the cursor and the clicks
| meant for the markers inside it.
*/
const OFFICE_CIRCLE_STYLE = {
  color: OFFICE_COLOUR,
  weight: 2,
  opacity: 0.9,
  dashArray: "5 4",
  fillColor: OFFICE_COLOUR,
  fillOpacity: 0.12,
  interactive: false,
};

/*
| The line from the office to a punch.
|
| Coloured by the punch it reaches rather than by the office it leaves, so a
| reader following the amber line knows which end of the day they are looking
| at without reading either pin.
|
| Dashed and finer than the boundary. A line drawn between two points is a
| measurement, not a route - nobody walked it - and a solid stroke would say
| otherwise. `interactive: false` keeps it from taking clicks meant for the
| pins at either end.
*/
const DISTANCE_LINE_STYLE = {
  weight: 2,
  opacity: 0.7,
  dashArray: "3 5",
  interactive: false,
};

/*
| The distance, written on its own line.
|
| A `divIcon` rather than Leaflet's own tooltip: a permanent tooltip arrives
| wearing a white box, a border and a shadow that would have to be overridden
| from a stylesheet, and this page already writes its map labels as markup.
| The pill is white with the line's colour on the text and its edge, so the
| number belongs to the line it sits on rather than floating over the map.
*/
const distanceLabelIcon = (label, colour) =>
  L.divIcon({
    className: "",
    html:
      `<span style="display:inline-flex;align-items:center;justify-content:center;` +
      `height:20px;padding:0 7px;border-radius:9999px;background:#fff;` +
      `color:${colour};border:1px solid ${colour}59;` +
      `font:700 10px/1 ui-sans-serif,system-ui,sans-serif;white-space:nowrap;` +
      `box-shadow:0 1px 2px rgba(15,23,42,.25)">${label}</span>`,
    iconSize: [56, 20],
    iconAnchor: [28, 10],
  });

function PunchMap({ punchIn, punchOut, office }) {

  const containerRef = useRef(null);

  useEffect(() => {

    const points = [
      { location: punchIn, label: "In", colour: "#059669" },
      { location: punchOut, label: "Out", colour: "#d97706" },
    ].filter((point) => isPlottable(point.location));

    /*
    | The map is still about the punches: a day with nothing plottable gets
    | no map, an office on its own is not worth a frame, and the office only
    | ever joins a view that already had something in it.
    */
    if (!points.length || !containerRef.current) return undefined;

    /*
    | Read on every render, and a company that has never configured an office
    | is the ordinary case rather than a guard - so it is checked here rather
    | than assumed from the point having been fetched at all.
    */
    const officePoint = isPlottable(office) ? office : null;

    /*
    | Scroll wheel zoom stays off. The map is no longer inside a scrolling
    | panel, but it is still tall enough to fill a phone screen, and a wheel
    | or a trackpad swipe over it would zoom the map instead of leaving the
    | page. The plus and minus controls do the zooming, deliberately.
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

    /*
    | The circle first, so the boundary reads as ground the punches sit on.
    | The radius is optional in its own right: a point that arrived without
    | one is still worth marking, and a circle of no size is not.
    */
    if (officePoint) {

      if (Number.isFinite(officePoint.radius)) {

        L.circle(
          [officePoint.latitude, officePoint.longitude],
          { radius: officePoint.radius, ...OFFICE_CIRCLE_STYLE }
        ).addTo(map);

      }

      /*
      |------------------------------------------------------------------
      | Distance lines
      |------------------------------------------------------------------
      | One line from the office to each punch, carrying the distance the
      | cards below already report.
      |
      | The number is `officeComparison`'s own `label` - the same call, the
      | same argument, the same string the verdict pill shows. Nothing is
      | measured here: a second distance worked out on the map would be a
      | second answer to a question that already has one, and the two would
      | eventually disagree.
      |
      | Skipped along with the circle when the office carries no radius,
      | because that is exactly when `officeComparison` has no distance to
      | give and a line with nothing written on it says less than no line.
      */
      points.forEach((point) => {

        const againstOffice = officeComparison(point.location, officePoint);

        if (!againstOffice) return;

        const officeLatLng = [officePoint.latitude, officePoint.longitude];

        const punchLatLng = [
          point.location.latitude,
          point.location.longitude,
        ];

        L.polyline(
          [officeLatLng, punchLatLng],
          { color: point.colour, ...DISTANCE_LINE_STYLE }
        ).addTo(map);

        /*
        | Halfway along, by the average of the two ends. Where to put a label
        | is not a measurement - the distance it displays was handed over
        | already worked out - so the midpoint is placed the plainest way
        | there is rather than through another projection.
        */
        L.marker(
          [
            (officePoint.latitude + point.location.latitude) / 2,
            (officePoint.longitude + point.location.longitude) / 2,
          ],
          {
            icon: distanceLabelIcon(againstOffice.label, point.colour),
            // Nothing to click, and it must not swallow a hover meant for
            // the pin it may be sitting near
            interactive: false,
          }
        ).addTo(map);

      });

      /*
      | Above the punch pins. Leaflet otherwise stacks markers by latitude,
      | which decides on geography whether a punch made at the office hides
      | the office or the other way round - and the label that carries a word
      | nobody can guess is the one that has to survive.
      |
      | No tooltip: the name is already on the pin, and a hover that repeats
      | it says nothing the pin has not.
      */
      L.marker(
        [officePoint.latitude, officePoint.longitude],
        { icon: officeIcon(), zIndexOffset: 1000 }
      ).addTo(map);

    }

    /*
    | The whole picture, not just the punches: a punch outside the boundary
    | is only legible next to the boundary it is outside of, so the office
    | and its circle are fitted along with the readings.
    */
    if (points.length > 1 || officePoint) {

      const bounds = L.latLngBounds(
        points.map((point) => [
          point.location.latitude,
          point.location.longitude,
        ])
      );

      if (officePoint) {

        const centre = L.latLng(
          officePoint.latitude,
          officePoint.longitude
        );

        /*
        | The circle reaches past its own centre, and its edge is the part
        | that has to stay in view.
        |
        | Measured from the radius rather than asked of the circle.
        | `Circle.getBounds` projects through the map it was added to, and a
        | layer is only given that map once the map has a view - which is the
        | very thing being worked out here, so the circle has none to project
        | through yet. `toBounds` takes a side length and needs no map at all,
        | hence twice the radius for a box the circle fits inside.
        */
        bounds.extend(
          Number.isFinite(officePoint.radius)
            ? centre.toBounds(officePoint.radius * 2)
            : centre
        );

      }

      // Padding keeps a marker sitting on the boundary off the very edge
      map.fitBounds(bounds, { padding: [40, 40] });

    } else {

      map.setView(
        [points[0].location.latitude, points[0].location.longitude],
        SINGLE_POINT_ZOOM
      );

    }

    /*
    | The card this sits in is laid out in the same paint as the map, so the
    | container can still be settling when the map measures it - which leaves
    | Leaflet drawing tiles for a size that is already wrong. One re-measure
    | on the next frame covers it.
    */
    const settle = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(settle);
      map.remove();
    };

    // `office` is fetched alongside the record, so the map is built once
    // without it and again the moment it lands
  }, [punchIn, punchOut, office]);

  // A day with nothing plottable gets no map rather than an empty grey frame
  if (!isPlottable(punchIn) && !isPlottable(punchOut)) return null;

  /*
  | Taller than the 256px the dialog allowed, and taller again at each width.
  | The height is the whole reason this became a page: a map is read by
  | looking around it, and there was no looking around a frame that size.
  |
  | Pulled back from the 34rem it first took, though. The punch cards under
  | it are the other half of the page, and at that height they sat below the
  | fold on a laptop - so the map is now large enough to read and short
  | enough to leave them in the same view.
  |
  | No border or radius of its own - the card it sits in carries both, and the
  | tiles run to the card's edge rather than sitting in a frame inside a
  | frame.
  */
  return (
    <div
      ref={containerRef}
      className="h-[18rem] w-full sm:h-[24rem] lg:h-[28rem]"
    />
  );

}

/*
| Outside is amber rather than red. A punch made away from the office is not
| a fault - a site visit, a client meeting and a delivery all look like this
| - so the tone says worth noticing, not worth answering for.
|
| `unclear` keeps the neutral tone it always had. It no longer carries a
| word, so the tone is the whole of what it says: nothing is being claimed.
*/
const OFFICE_STYLES = {
  inside: "border-emerald-200 bg-emerald-50 text-emerald-700",
  outside: "border-amber-200 bg-amber-50 text-amber-700",
  unclear: "border-line bg-surface-muted text-ink-muted",
};

/*
| Two verdicts, where `officeComparison` returns three.
|
| `unclear` is deliberately absent rather than mapped to a phrase. It is a
| real answer - the reading's own margin reaches past the boundary, so
| neither inside nor outside can be said - but it is only explicable in terms
| of GPS accuracy, and accuracy is not something this screen puts in front of
| anybody any more. A missing key reads as falsy below, and the row falls back
| to the distance alone: still a fact, and one that needs no explaining.
|
| The calculation is untouched. All three verdicts are still computed, and
| `unclear` still decides the tone - it simply no longer states a conclusion
| it would have to qualify.
*/
const OFFICE_LABELS = {
  inside: "Inside office",
  outside: "Outside office",
};

/*
|--------------------------------------------------------------------------
| Office Verdict
|--------------------------------------------------------------------------
| The comparison as a pill rather than the full width banner it was, because
| it now sits inside a punch card beside a sibling: two banners stacked in
| two cards read as two warnings, where two pills read as two labels.
|
| The wording still carries the noun. "Inside office · 40 m" needs no more
| than that, but a distance standing alone would - so the verdictless case
| keeps "from the office" and says what the number is measuring.
*/
function OfficeVerdict({ againstOffice }) {

  const verdictLabel = OFFICE_LABELS[againstOffice.verdict];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        OFFICE_STYLES[againstOffice.verdict]
      }`}
    >

      <FiHome className="shrink-0" size={12} />

      {verdictLabel ? (
        <span>
          {verdictLabel}

          <span className="font-medium opacity-75">
            {" "}· {againstOffice.label}
          </span>
        </span>
      ) : (
        <span>{againstOffice.label} from the office</span>
      )}

    </span>
  );

}

/*
|--------------------------------------------------------------------------
| Punch Activity
|--------------------------------------------------------------------------
| One punch: when it happened, and where.
|
| Both punches get a card whether or not either carried a location. The
| section before this returned nothing at all for a punch without one, which
| left a half recorded day showing a single lonely heading and no way to tell
| whether the other punch was missing or merely unplaced. A card that says so
| answers that, and it is the same answer the map gives by having one pin.
|
| The time comes from the record the page already reads - `punchIn` and
| `punchOut` sit on the same node as the coordinates. It is not a GPS
| reading and it is not derived here; it is the punch this card is about.
*/
function PunchActivity({ icon, tone, label, time, location, office }) {

  const plottable = isPlottable(location);

  /*
  | Null whenever there is nothing to compare against - no office configured,
  | or one that could not be read. The pill simply does not appear, and
  | everything else on the card is unchanged.
  */
  const againstOffice = plottable ? officeComparison(location, office) : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">

      {/*
      | The time carries the card. It is the one thing on it that is a value
      | rather than a label, so it is set at heading weight with the name of
      | the punch above it as an eyebrow - the anatomy the page header and the
      | summary tiles already use, rather than two lines of the same size.
      */}
      <div className="flex items-center gap-3">

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          {icon}
        </span>

        <div className="min-w-0">

          <p className="ui-eyebrow">
            {label}
          </p>

          <p className="mt-1 truncate text-lg font-bold leading-none text-ink">
            {time}
          </p>

        </div>

      </div>

      {/*
      | The verdict, when there is one to give.
      |
      | Nothing takes its place when there is not. A punch that was plotted
      | but has no office to be held against says so once, at the top of the
      | page, where the boundary chip reads "Not configured" - repeating it on
      | both cards would say the same thing three times, and the pin on the
      | map is already the whole of what this card would be adding.
      */}
      {plottable && againstOffice && (
        <div className="mt-4 border-t border-line-subtle pt-4">
          <OfficeVerdict againstOffice={againstOffice} />
        </div>
      )}

      {!plottable && (
        <p className="mt-4 border-t border-line-subtle pt-4 text-xs text-ink-subtle">
          No location was recorded for this punch.
        </p>
      )}

    </div>
  );

}

/*
|--------------------------------------------------------------------------
| Attendance Location
|--------------------------------------------------------------------------
| The day and the employee come from the URL rather than from whoever linked
| here, the way every other detail screen in the app is addressed. It is what
| makes the page survive a refresh and a pasted link - the dialog this
| replaced could only ever exist for as long as a row stayed clicked.
|
| The record is read the same way the punch card reads it, through the
| existing day subscription: one node, live, so a punch out landing while the
| page is open puts its pin on the map without a reload.
|
| Loading is derived from which request has been delivered, so it resets on
| its own without setting state from inside the effect body.
|--------------------------------------------------------------------------
*/

function AttendanceLocation() {

  const { date, employeeId } = useParams();

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const { office } = useOfficeLocation();

  /*
  | For the employee's name, which the record itself does not carry - the
  | stored node holds an id, and the name lives in the directory the rest of
  | the module joins against. `getEmployeeDetails` falls back to the id, so a
  | directory that has not arrived yet reads as the id rather than as blank.
  */
  const { directory } = useEmployeeDirectory(companyCode);

  const [state, setState] = useState({
    key: "",
    record: null,
    error: "",
  });

  const enabled = Boolean(companyCode && employeeId && date);

  const key = `${companyCode}|${employeeId}|${date}`;

  const isCurrent = state.key === key;

  useEffect(() => {

    if (!enabled) return undefined;

    const unsubscribe = subscribeToEmployeeDay(
      companyCode,
      employeeId,
      date,
      (record) => {
        setState({ key, record, error: "" });
      },
      // Without this the subscription fails silently and loading never ends.
      (subscriptionError) => {

        console.error("Failed to load punch location:", subscriptionError);

        setState({
          key,
          record: null,
          error:
            subscriptionError.message || "Failed to load this day.",
        });

      }
    );

    return () => unsubscribe();

  }, [companyCode, employeeId, date, enabled, key]);

  const record = isCurrent ? state.record : null;

  const loading = enabled && !isCurrent;

  const error = isCurrent ? state.error : "";

  const employeeName = getEmployeeDetails(directory, employeeId).name;

  const punchIn = record?.location?.punchIn;
  const punchOut = record?.location?.punchOut;

  const hasAny = isPlottable(punchIn) || isPlottable(punchOut);

  /*
  | The configured boundary, stated rather than computed. `office` is already
  | sanitized on the way out of storage; this only says whether there is one
  | and how wide the company set it.
  |
  | Worth stating because nothing else on the page does. The circle on the map
  | shows where the boundary runs but never how wide it was set, and the same
  | "Outside office · 1.2 km" means two different things against 200 m and
  | against 5 km. The unconfigured case earns its line too: with no office
  | there are no verdicts anywhere on the page, and saying so is better than
  | leaving somebody to wonder where they went.
  */
  const boundaryValue = Number.isFinite(office?.radius)
    ? `${office.radius} m radius`
    : "Not configured";

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Punch Location"
        subtitle={`${employeeName} · ${formatDate(date)}`}
        icon={<FiMapPin />}
      />

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        {loading && (
          <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-surface-muted sm:h-[24rem] lg:h-[28rem]" />
        )}

        {!loading && error && (
          <div className="ui-card ui-card-body">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        )}

        {/*
        | A day with no record at all, which a hand typed URL can ask for and
        | a deleted day can become.
        */}
        {!loading && !error && !record && (
          <div className="ui-card ui-card-body">
            <p className="text-sm text-ink-subtle">
              No attendance was recorded for this day.
            </p>
          </div>
        )}

        {!loading && !error && record && (
          <>

            {/*
            |--------------------------------------------------------------
            | Office Boundary
            |--------------------------------------------------------------
            | A line rather than the three tile panel this was. Two of those
            | three tiles were saying something the page already said: what
            | was captured is what the map plots and what the two cards below
            | report a punch at a time, and the punch window is the two times
            | those cards already carry beside their own punch - which is
            | where a time belongs, next to the punch it describes.
            |
            | What was left is one fact, and one fact is a line. It sits above
            | the map because that is what it explains: the dashed circle down
            | there is this number.
            |
            | Drawn as a chip with the name and the number apart, rather than
            | as one muted sentence. "Office boundary · 200 m radius" read as
            | prose and the number - the only part that varies, and the part
            | every distance below is weighed against - carried no more weight
            | than the label naming it. Now the label recedes and the value
            | reads as a value.
            */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-line-subtle bg-surface-muted py-1.5 pl-3 pr-3.5">

              <FiHome className="shrink-0 text-ink-subtle" size={13} />

              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                Office boundary
              </span>

              <span className="h-3 w-px shrink-0 bg-line" aria-hidden="true" />

              <span className="text-xs font-semibold text-ink">
                {boundaryValue}
              </span>

            </div>

            {/*
            |--------------------------------------------------------------
            | The Map
            |--------------------------------------------------------------
            | One map carrying whichever punches were recorded, given the
            | whole width of the page. One map rather than one per punch: the
            | pair is only worth anything held against each other, and two
            | frames showing the same street from two angles said nothing.
            |
            | The card is unpadded so the tiles run to its edge - a map inset
            | inside a panel reads as a thumbnail, however tall it is.
            |
            | `isolate` is what keeps the map underneath the app's overlays.
            | Leaflet numbers its own layers from 400 up - panes at 400, markers
            | at 600, controls at 1000 - and with nothing between them and the
            | root those numbers compete directly with the drawers and modals
            | above them, which sit at 40 and 50. The zoom buttons and the pins
            | won that argument and drew straight through the Profile drawer.
            |
            | `isolation: isolate` gives this card a stacking context of its
            | own, so Leaflet's numbers are settled inside it and the card as a
            | whole takes its place in the page's order - beneath anything with
            | a positive z-index, which is every overlay in the app. One
            | property here rather than a raised z-index on each overlay: the
            | map is the one element with a private numbering scheme, so it is
            | the one that should be contained.
            */}
            {hasAny && (
              <section className="isolate overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                <PunchMap
                  punchIn={punchIn}
                  punchOut={punchOut}
                  office={office}
                />
              </section>
            )}

            {/*
            |--------------------------------------------------------------
            | Punch Activity
            |--------------------------------------------------------------
            | Both punches, side by side from `sm`. Side by side rather than
            | stacked because the two are read against each other - the whole
            | question is whether the day started and ended in the same place
            | - and a card each keeps that comparison on one screen.
            */}
            <section className="ui-card ui-card-body">

              <h2 className="ui-card-title">
                Punch Activity
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <PunchActivity
                  icon={<FiLogIn size={16} />}
                  tone="bg-emerald-50 text-emerald-600"
                  label="Punch In"
                  time={formatTime(record.punchIn)}
                  location={punchIn}
                  office={office}
                />

                <PunchActivity
                  icon={<FiLogOut size={16} />}
                  tone="bg-amber-50 text-amber-600"
                  label="Punch Out"
                  time={formatTime(record.punchOut)}
                  location={punchOut}
                  office={office}
                />

              </div>

            </section>

          </>
        )}

      </div>

    </div>
  );

}

export default AttendanceLocation;
