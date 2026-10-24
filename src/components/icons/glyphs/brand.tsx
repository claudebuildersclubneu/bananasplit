import { createIcon } from "../create-icon";

/*
 * Bananasplit's own glyphs, with no counterpart in a general icon set. The
 * Core is the logo drawn as an icon: one colour, the set's stroke, for
 * where the full-colour mark would be too loud (a menu row, a chip).
 */

const coreSeed = <ellipse cx="12" cy="8.1" rx="1.6" ry="2.9" />;

export const Core = /* @__PURE__ */ createIcon(
  "Core",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <g fill="currentColor" stroke="none">
      {coreSeed}
      <g transform="rotate(120 12 12)">{coreSeed}</g>
      <g transform="rotate(240 12 12)">{coreSeed}</g>
    </g>
  </>,
);
export const Banana = /* @__PURE__ */ createIcon(
  "Banana",
  <path d="M18.5 5.5c1.3 5.6-1 10.7-5.8 12.8-3.4 1.5-7.3.9-9.7-1.6 5.3.3 9.6-1.8 11.9-5.6 1.2-2 1.8-3.8 1.9-5.6zm0 0 .8-2.5" />,
);
