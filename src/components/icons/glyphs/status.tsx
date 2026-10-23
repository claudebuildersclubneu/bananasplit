import { createIcon, seed } from "../create-icon";

/* Marks, states and alerts. A full circle is r9; a square is 18 across with r3 corners. */

const ring = <circle cx="12" cy="12" r="9" />;
const square = <rect x="3" y="3" width="18" height="18" rx="3" />;

export const Check = /* @__PURE__ */ createIcon("Check", <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const CheckCheck = /* @__PURE__ */ createIcon(
  "CheckCheck",
  <path d="M2.5 12.5 7 17l9-9.5m-3.5 8.5 1 1 8.5-9" />,
);
export const X = /* @__PURE__ */ createIcon("X", <path d="m6.5 6.5 11 11m0-11-11 11" />);
export const Plus = /* @__PURE__ */ createIcon("Plus", <path d="M12 5v14m-7-7h14" />);
export const Minus = /* @__PURE__ */ createIcon("Minus", <path d="M5 12h14" />);

export const Info = /* @__PURE__ */ createIcon(
  "Info",
  <>
    {ring}
    <path d="M12 11v5.5" />
    {seed(12, 7.75)}
  </>,
);
export const CircleAlert = /* @__PURE__ */ createIcon(
  "CircleAlert",
  <>
    {ring}
    <path d="M12 7.5V13" />
    {seed(12, 16.25)}
  </>,
);
export const TriangleAlert = /* @__PURE__ */ createIcon(
  "TriangleAlert",
  <>
    <path d="M10.3 4.4a2 2 0 0 1 3.4 0l7.5 13a2.2 2.2 0 0 1-1.9 3.3H4.7a2.2 2.2 0 0 1-1.9-3.3z" />
    <path d="M12 9.5v4" />
    {seed(12, 16.75)}
  </>,
);
export const CircleCheck = /* @__PURE__ */ createIcon(
  "CircleCheck",
  <>
    {ring}
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
);
export const CircleX = /* @__PURE__ */ createIcon(
  "CircleX",
  <>
    {ring}
    <path d="m9.5 9.5 5 5m0-5-5 5" />
  </>,
);
export const CircleMinus = /* @__PURE__ */ createIcon(
  "CircleMinus",
  <>
    {ring}
    <path d="M8.5 12h7" />
  </>,
);
export const CirclePause = /* @__PURE__ */ createIcon(
  "CirclePause",
  <>
    {ring}
    <path d="M10 9v6m4-6v6" />
  </>,
);
export const CircleQuestionMark = /* @__PURE__ */ createIcon(
  "CircleQuestionMark",
  <>
    {ring}
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5" />
    {seed(12, 16.75)}
  </>,
);
export const CircleDashed = /* @__PURE__ */ createIcon(
  "CircleDashed",
  <circle cx="12" cy="12" r="9" strokeDasharray="2.5 4.57" />,
);
export const CircleDot = /* @__PURE__ */ createIcon(
  "CircleDot",
  <>
    {ring}
    {seed(12, 12, 3)}
  </>,
);
export const Ban = /* @__PURE__ */ createIcon(
  "Ban",
  <>
    {ring}
    <path d="m5.6 5.6 12.8 12.8" />
  </>,
);
export const SquareCheck = /* @__PURE__ */ createIcon(
  "SquareCheck",
  <>
    {square}
    <path d="m8 12 3 3 5-5.5" />
  </>,
);

const shield =
  "M12 3 5.5 5.3a1.5 1.5 0 0 0-1 1.4V12c0 4.6 3.2 7.6 7.5 9 4.3-1.4 7.5-4.4 7.5-9V6.7a1.5 1.5 0 0 0-1-1.4z";

export const ShieldCheck = /* @__PURE__ */ createIcon(
  "ShieldCheck",
  <>
    <path d={shield} />
    <path d="m9 12 2 2 4-4.5" />
  </>,
);
export const ShieldAlert = /* @__PURE__ */ createIcon(
  "ShieldAlert",
  <>
    <path d={shield} />
    <path d="M12 8v4.5" />
    {seed(12, 15.75)}
  </>,
);
export const BadgeCheck = /* @__PURE__ */ createIcon(
  "BadgeCheck",
  <>
    <path d="M12 3.7a3.6 3.6 0 0 1 5.87 2.43 3.6 3.6 0 0 1 2.43 5.87 3.6 3.6 0 0 1-2.43 5.87A3.6 3.6 0 0 1 12 20.3a3.6 3.6 0 0 1-5.87-2.43A3.6 3.6 0 0 1 3.7 12a3.6 3.6 0 0 1 2.43-5.87A3.6 3.6 0 0 1 12 3.7z" />
    <path d="m8.75 12 2.25 2.25 4.25-4.5" />
  </>,
);

export const Activity = /* @__PURE__ */ createIcon(
  "Activity",
  <path d="M2.5 12H6l2.5-6 4.5 12 3-8 1.5 2h4" />,
);
export const Zap = /* @__PURE__ */ createIcon(
  "Zap",
  <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z" />,
);

/**
 * The loading mark: the logo's three seeds, fading round. Spin it with
 * animate-spin.
 */
export const Loader = /* @__PURE__ */ createIcon(
  "Loader",
  <g fill="currentColor" stroke="none">
    <ellipse cx="12" cy="6" rx="2.25" ry="3.75" />
    <ellipse cx="12" cy="6" rx="2.25" ry="3.75" opacity=".6" transform="rotate(120 12 12)" />
    <ellipse cx="12" cy="6" rx="2.25" ry="3.75" opacity=".3" transform="rotate(240 12 12)" />
  </g>,
);

export const Sparkles = /* @__PURE__ */ createIcon(
  "Sparkles",
  <>
    <path d="M10 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
    <path d="M18 14.5c.3 1.7 1.1 2.5 2.75 2.75-1.65.3-2.45 1.1-2.75 2.75-.3-1.65-1.1-2.45-2.75-2.75 1.65-.25 2.45-1.05 2.75-2.75z" />
    {seed(19, 5)}
  </>,
);
export const Star = /* @__PURE__ */ createIcon(
  "Star",
  <path d="m12 3 2.59 5.74 6.26.69-4.67 4.23 1.29 6.16L12 16.7l-5.47 3.12 1.29-6.16-4.67-4.23 6.26-.69z" />,
);
export const Target = /* @__PURE__ */ createIcon(
  "Target",
  <>
    {ring}
    <circle cx="12" cy="12" r="5" />
    {seed(12, 12, 1.75)}
  </>,
);
export const Ellipsis = /* @__PURE__ */ createIcon(
  "Ellipsis",
  <>
    {seed(5, 12, 1.75)}
    {seed(12, 12, 1.75)}
    {seed(19, 12, 1.75)}
  </>,
);
export const GripVertical = /* @__PURE__ */ createIcon(
  "GripVertical",
  <>
    {seed(9, 6, 1.5)}
    {seed(9, 12, 1.5)}
    {seed(9, 18, 1.5)}
    {seed(15, 6, 1.5)}
    {seed(15, 12, 1.5)}
    {seed(15, 18, 1.5)}
  </>,
);
export const Flag = /* @__PURE__ */ createIcon(
  "Flag",
  <path d="M5 21.5v-17m0 0c3.5-2 6 0 8 1s4.5 1 6.5 0V15c-2 1-4.5 1-6.5 0s-4.5-3-8-1" />,
);
export const Pin = /* @__PURE__ */ createIcon(
  "Pin",
  <path d="M12 16.5v5M8 3.5h8m-6.5 0h5v6l3.5 4v3H6v-3l3.5-4z" />,
);
export const MapPin = /* @__PURE__ */ createIcon(
  "MapPin",
  <>
    <path d="M12 21.5s7-6.2 7-11.5a7 7 0 0 0-14 0c0 5.3 7 11.5 7 11.5z" />
    {seed(12, 10, 2.25)}
  </>,
);
export const Bookmark = /* @__PURE__ */ createIcon(
  "Bookmark",
  <path d="M18.5 20.5 12 16.5l-6.5 4V6A2.5 2.5 0 0 1 8 3.5h8A2.5 2.5 0 0 1 18.5 6z" />,
);
