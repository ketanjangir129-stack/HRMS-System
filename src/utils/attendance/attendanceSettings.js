import { DEFAULT_WORK_RULES } from "./attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Settings
|--------------------------------------------------------------------------
| The working day a company is on: when it starts, when it ends, and how long
| after the start somebody can still arrive without being marked Late.
|
|   { startTime: "09:30", endTime: "18:30", gracePeriodMinutes: 15 }
|
| Nothing here reads Firebase and nothing here reads the screen. The settings
| service that stores the record, the attendance service that derives a status
| from a punch, the editor hook and the panel all work off this file, so a
| grace period means the same thing in every one of them.
|
| Same-day schedules only. A working day that ends before it starts is a night
| shift, which is a shape of its own rather than a value squeezed into this
| one, so it is refused here rather than stored and misread later.
|--------------------------------------------------------------------------
*/

/*
| A 24 hour "HH:mm", which is what `<input type="time">` gives back and what
| the record stores. Anchored at both ends so "9:3" and "09:30:00" are both
| refused rather than half parsed.
*/

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isTimeValue = (value) =>
  TIME_PATTERN.test(String(value ?? ""));

/*
| A time of day as minutes since midnight, or null for anything that is not
| one. Null rather than 0, because 0 is a real time - midnight - and a caller
| that cannot tell the two apart would read a malformed value as the start of
| the day.
*/

export const toMinutesOfDay = (value) => {

  const match = TIME_PATTERN.exec(String(value ?? ""));

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);

};

/*
| "09:30" written the way the screen says it. The stored value stays 24 hour;
| this is only for reading.
*/

export const formatTimeValue = (value) => {

  const minutes = toMinutesOfDay(value);

  if (minutes === null) return "--";

  const date = new Date();

  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

};

/*
| Minutes. A grace period is a few minutes of leeway, not a second start time,
| so an hour is already generous and four is where it stops being a grace
| period at all.
|
| Exported because the editor and the panel report the same ceiling, and a
| second copy of the number is a second place for it to drift.
*/

export const MAX_GRACE_MINUTES = 240;

/*
|--------------------------------------------------------------------------
| Derived Values
|--------------------------------------------------------------------------
| The two numbers the attendance module actually works in. Both take the rules
| as they come and fall back field by field, so a caller that passes nothing,
| a half configured record, or a value edited in the Firebase console all get
| a usable answer instead of a NaN that spreads.
*/

const minutesOr = (value, fallback) => {

  const minutes = toMinutesOfDay(value);

  return minutes === null ? toMinutesOfDay(fallback) : minutes;

};

/*
| A grace period read as a whole number of minutes. Anything that is not one -
| missing, negative, a string the console left behind - falls back to the
| default rather than to zero, which would silently start marking people Late
| the moment a field went astray.
*/

const toGraceMinutes = (value) => {

  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes < 0) {
    return DEFAULT_WORK_RULES.gracePeriodMinutes;
  }

  return Math.min(Math.floor(minutes), MAX_GRACE_MINUTES);

};

/*
| The moment a punch in stops being on time. Everything strictly after it is
| Late, so a punch exactly on the cut off is still Present.
*/

export const getLateCutoffMinutes = (workRules) =>
  minutesOr(workRules?.startTime, DEFAULT_WORK_RULES.startTime) +
  toGraceMinutes(workRules?.gracePeriodMinutes);

/*
| The full working day, in minutes, which is the span the two configured times
| bound. Never stored: `09:30` to `18:30` is nine hours whether or not anybody
| writes 540 down beside it.
*/

export const getWorkDayMinutes = (workRules) => {

  const start = minutesOr(
    workRules?.startTime,
    DEFAULT_WORK_RULES.startTime
  );

  const end = minutesOr(
    workRules?.endTime,
    DEFAULT_WORK_RULES.endTime
  );

  /*
  | A span that is not positive cannot be divided into or measured against, so
  | it falls back to the default day rather than reporting a working day of
  | zero, which would put every progress bar at 100%.
  */
  return end > start
    ? end - start
    : toMinutesOfDay(DEFAULT_WORK_RULES.endTime) -
      toMinutesOfDay(DEFAULT_WORK_RULES.startTime);

};

/*
| The default working day, for the places that are deliberately not company
| aware. Derived rather than written down, so the one pair of default times
| above stays the only statement of what a working day is.
*/

export const DEFAULT_WORK_DAY_MINUTES =
  getWorkDayMinutes(DEFAULT_WORK_RULES);

/*
|--------------------------------------------------------------------------
| Normalize
|--------------------------------------------------------------------------
| A stored record merged over the defaults.
|
| A company with no `attendance/settings` node, and any single field an older
| record never stored, both fall back to the defaults rather than to nothing:
| a missing start time is "not configured", and reading it as midnight would
| quietly mark the whole company Late.
|
| The pair is then checked as a pair. Two individually valid times that do not
| make a same-day schedule - a start at or after the end - are not a near miss
| to be patched one field at a time: whichever of them is wrong, the schedule
| as a whole says nothing usable, so both go back to the defaults together.
*/

export const normalizeWorkRules = (stored) => {

  const startTime = isTimeValue(stored?.startTime)
    ? stored.startTime
    : DEFAULT_WORK_RULES.startTime;

  const endTime = isTimeValue(stored?.endTime)
    ? stored.endTime
    : DEFAULT_WORK_RULES.endTime;

  const sameDay =
    toMinutesOfDay(endTime) > toMinutesOfDay(startTime);

  return {

    startTime: sameDay ? startTime : DEFAULT_WORK_RULES.startTime,

    endTime: sameDay ? endTime : DEFAULT_WORK_RULES.endTime,

    gracePeriodMinutes: toGraceMinutes(
      stored?.gracePeriodMinutes
    ),

  };

};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns a `{ field: message }` map, empty when the draft can be saved. The
| same map the manual attendance form returns, so the panel renders errors
| under the box they belong to instead of printing one complaint for the form.
|
| This is not `normalizeWorkRules` with messages attached. Normalizing is what
| makes a stored record usable and silently repairs it; validating is what
| refuses to store one in the first place, and a value quietly corrected on
| the way in is a value the person who typed it never learns was wrong.
*/

export const validateWorkRules = (draft) => {

  const errors = {};

  if (!isTimeValue(draft?.startTime)) {
    errors.startTime = "Enter a valid work start time.";
  }

  if (!isTimeValue(draft?.endTime)) {
    errors.endTime = "Enter a valid work end time.";
  }

  const grace = Number(draft?.gracePeriodMinutes);

  if (
    draft?.gracePeriodMinutes === "" ||
    draft?.gracePeriodMinutes === null ||
    draft?.gracePeriodMinutes === undefined ||
    !Number.isFinite(grace)
  ) {
    errors.gracePeriodMinutes = "Grace period is required.";
  }

  else if (grace < 0) {
    errors.gracePeriodMinutes = "Grace period cannot be negative.";
  }

  else if (grace > MAX_GRACE_MINUTES) {
    errors.gracePeriodMinutes =
      `Grace period cannot be more than ${MAX_GRACE_MINUTES} minutes.`;
  }

  // Nothing below can be judged until both times are readable.
  if (errors.startTime || errors.endTime) return errors;

  const start = toMinutesOfDay(draft.startTime);
  const end = toMinutesOfDay(draft.endTime);

  if (start >= end) {
    errors.endTime = "End time must be later than start time.";
    return errors;
  }

  /*
  | A grace period that runs past the end of the day would make every punch of
  | it on time, which is not a schedule anybody means to configure.
  */
  if (!errors.gracePeriodMinutes && start + grace >= end) {
    errors.gracePeriodMinutes =
      "Grace period must end before the work end time.";
  }

  return errors;

};

/*
|--------------------------------------------------------------------------
| Storage Shape
|--------------------------------------------------------------------------
| A draft reduced to the three keys this file declares, as the types they are
| stored in.
|
| Rebuilt rather than spread: the panel holds a form, and a caller that hands
| the whole form over must not be able to push its extra keys into the record.
| The grace period is stored as a number, because the field holds the string
| that was typed and a string minute count would compare as text everywhere
| downstream.
*/

export const toStoredWorkRules = (draft) => {

  const rules = normalizeWorkRules({
    startTime: draft?.startTime,
    endTime: draft?.endTime,
    gracePeriodMinutes: draft?.gracePeriodMinutes,
  });

  return {
    startTime: rules.startTime,
    endTime: rules.endTime,
    gracePeriodMinutes: rules.gracePeriodMinutes,
  };

};

/*
| Whether a draft still matches what is stored, so Save can be held disabled
| while there is nothing to save - and so an unchanged form never writes.
*/

export const isSameWorkRules = (left, right) =>
  String(left?.startTime) === String(right?.startTime) &&
  String(left?.endTime) === String(right?.endTime) &&
  String(left?.gracePeriodMinutes) === String(right?.gracePeriodMinutes);
