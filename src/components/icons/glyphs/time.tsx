import { createIcon, seed } from "../create-icon";

/*
 * Calendars, clocks and the sky. A calendar is a 17-by-16 page with two
 * rings; when a badge (a clock, a sync) needs its corner, the page stops
 * short of it rather than running underneath.
 */

const page = (
  <>
    <rect x="3.5" y="5" width="17" height="16" rx="3" />
    <path d="M8 3v4m8-4v4M3.5 10h17" />
  </>
);
/** The page with its bottom-right corner cut away for a badge. */
const cutPage = (
  <path d="M20.5 11V8a3 3 0 0 0-3-3h-11a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3H11M8 3v4m8-4v4M3.5 10h17" />
);

export const Calendar = /* @__PURE__ */ createIcon("Calendar", page);
export const CalendarDays = /* @__PURE__ */ createIcon(
  "CalendarDays",
  <>
    {page}
    {seed(8, 13.75, 1)}
    {seed(12, 13.75, 1)}
    {seed(16, 13.75, 1)}
    {seed(8, 17.25, 1)}
    {seed(12, 17.25, 1)}
    {seed(16, 17.25, 1)}
  </>,
);
export const CalendarCheck = /* @__PURE__ */ createIcon(
  "CalendarCheck",
  <>
    {page}
    <path d="m9 15.5 2 2 4-4" />
  </>,
);
export const CalendarX = /* @__PURE__ */ createIcon(
  "CalendarX",
  <>
    {page}
    <path d="m10 13.5 4 4m0-4-4 4" />
  </>,
);
export const CalendarPlus = /* @__PURE__ */ createIcon(
  "CalendarPlus",
  <>
    {page}
    <path d="M12 12.5v6m-3-3h6" />
  </>,
);
export const CalendarRange = /* @__PURE__ */ createIcon(
  "CalendarRange",
  <>
    {page}
    <path d="M10.5 14h6m-9 3.5h5" />
    {seed(7.75, 14, 1)}
    {seed(16, 17.5, 1)}
  </>,
);
export const CalendarClock = /* @__PURE__ */ createIcon(
  "CalendarClock",
  <>
    {cutPage}
    <circle cx="17" cy="17" r="4" />
    <path d="M17 15v2l1.25 1" />
  </>,
);
export const CalendarSync = /* @__PURE__ */ createIcon(
  "CalendarSync",
  <>
    {cutPage}
    <path d="M20.9 16.5a3.5 3.5 0 0 0-6.1-1.5m-.3-2v2.5H17m-2.9 3a3.5 3.5 0 0 0 6.1 1.5m.3 2v-2.5H18" />
  </>,
);

const face = <circle cx="12" cy="12" r="9" />;

export const Clock = /* @__PURE__ */ createIcon(
  "Clock",
  <>
    {face}
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const AlarmClock = /* @__PURE__ */ createIcon(
  "AlarmClock",
  <>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9.5V13l2.5 1.5M4.5 4l-2 2m17-2 2 2m-15 13.5L5 21m12.5-1.5L19 21" />
  </>,
);
export const Timer = /* @__PURE__ */ createIcon(
  "Timer",
  <>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M10 2.5h4m-2 0V6m0 7.5 3-3" />
  </>,
);
export const Hourglass = /* @__PURE__ */ createIcon(
  "Hourglass",
  <path d="M6.5 3h11m-11 18h11M8 3v3.2c0 1.3.6 2.5 1.6 3.3L12 12l2.4-2.5c1-.8 1.6-2 1.6-3.3V3M8 21v-3.2c0-1.3.6-2.5 1.6-3.3L12 12l2.4 2.5c1 .8 1.6 2 1.6 3.3V21" />,
);

/** The sun's rays are eight seeds. */
export const Sun = /* @__PURE__ */ createIcon(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4.25" />
    {seed(12, 3.75)}
    {seed(17.83, 6.17)}
    {seed(20.25, 12)}
    {seed(17.83, 17.83)}
    {seed(12, 20.25)}
    {seed(6.17, 17.83)}
    {seed(3.75, 12)}
    {seed(6.17, 6.17)}
  </>,
);
export const Sunrise = /* @__PURE__ */ createIcon(
  "Sunrise",
  <>
    <path d="M2.5 20.5h19m-14 0a4.5 4.5 0 0 1 9 0M12 3v6.5M9.5 5.5 12 3l2.5 2.5" />
    {seed(4.5, 17.75)}
    {seed(8, 13.6)}
    {seed(16, 13.6)}
    {seed(19.5, 17.75)}
  </>,
);
export const Moon = /* @__PURE__ */ createIcon(
  "Moon",
  <path d="M20.4 13.6A8.5 8.5 0 1 1 10.4 3.6a7.5 7.5 0 0 0 10 10z" />,
);
export const Umbrella = /* @__PURE__ */ createIcon(
  "Umbrella",
  <path d="M3 12a9 9 0 0 1 18 0 3 3 0 0 0-6 0 3 3 0 0 0-6 0 3 3 0 0 0-6 0zm9-3v10.5a2 2 0 0 1-4 0M12 2.5V3" />,
);
