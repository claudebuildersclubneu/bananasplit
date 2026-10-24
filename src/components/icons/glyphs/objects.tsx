import { createIcon, seed } from "../create-icon";

/* Things: settings, keys, places, gifts and gear. */

export const Settings = /* @__PURE__ */ createIcon(
  "Settings",
  <>
    <path d="M10.01 5.5l.34-2.86a9.5 9.5 0 0 1 3.3 0l.34 2.86a6.8 6.8 0 0 1 2.65 1.53l2.64-1.14a9.5 9.5 0 0 1 1.65 2.86l-2.3 1.72a6.8 6.8 0 0 1 0 3.06l2.3 1.72a9.5 9.5 0 0 1-1.65 2.86l-2.64-1.14a6.8 6.8 0 0 1-2.65 1.53l-.34 2.86a9.5 9.5 0 0 1-3.3 0l-.34-2.86a6.8 6.8 0 0 1-2.65-1.53l-2.64 1.14a9.5 9.5 0 0 1-1.65-2.86l2.3-1.72a6.8 6.8 0 0 1 0-3.06l-2.3-1.72a9.5 9.5 0 0 1 1.65-2.86l2.64 1.14a6.8 6.8 0 0 1 2.65-1.53z" />
    <circle cx="12" cy="12" r="2.75" />
  </>,
);
export const Settings2 = /* @__PURE__ */ createIcon(
  "Settings2",
  <>
    <path d="M4 7h9.5m7 10H10.5" />
    <circle cx="17" cy="7" r="2.75" />
    <circle cx="7" cy="17" r="2.75" />
  </>,
);

const lockBody = <rect x="4.5" y="10.5" width="15" height="10.5" rx="3" />;

export const Lock = /* @__PURE__ */ createIcon(
  "Lock",
  <>
    {lockBody}
    <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    {seed(12, 15.75)}
  </>,
);
export const LockOpen = /* @__PURE__ */ createIcon(
  "LockOpen",
  <>
    {lockBody}
    <path d="M8 10.5v-3a4 4 0 0 1 7.7-1.5" />
    {seed(12, 15.75)}
  </>,
);
export const KeyRound = /* @__PURE__ */ createIcon(
  "KeyRound",
  <>
    <circle cx="15.5" cy="8.5" r="5" />
    <path d="M11.9 12.1 3.5 20.5m3-3L9 20m-.5-4.5 2 2" />
    {seed(16.75, 7.25)}
  </>,
);
export const Lightbulb = /* @__PURE__ */ createIcon(
  "Lightbulb",
  <path d="M9 17.5v-2.2c0-.9-.5-1.7-1.2-2.4a6 6 0 1 1 8.4 0c-.7.7-1.2 1.5-1.2 2.4v2.2zm1 3.5h4" />,
);
export const Trophy = /* @__PURE__ */ createIcon(
  "Trophy",
  <path d="M7 3.5h10v6a5 5 0 0 1-10 0zm0 2H5a2 2 0 0 0 0 4h2.2M17 5.5h2a2 2 0 0 1 0 4h-2.2M12 14.5v3.5m-4 2.5h8m-6.5 0v-1A1.5 1.5 0 0 1 11 18h2a1.5 1.5 0 0 1 1.5 1.5v1" />,
);
export const Gift = /* @__PURE__ */ createIcon(
  "Gift",
  <>
    <rect x="3.5" y="8" width="17" height="4" rx="1.5" />
    <path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6m-7-4v13m0-13C10.5 4.5 7 3.5 7 6c0 1.5 2.5 2 5 2zm0 0c1.5-3.5 5-4.5 5-2 0 1.5-2.5 2-5 2z" />
  </>,
);
export const Package = /* @__PURE__ */ createIcon(
  "Package",
  <path d="M12 21.5 3.5 17V7L12 2.5 20.5 7v10zm-8.5-14.5 8.5 4.5L20.5 7M12 11.5v10M7.75 4.75l8.5 4.5" />,
);
export const Rocket = /* @__PURE__ */ createIcon(
  "Rocket",
  <>
    <path d="M10.5 16 8 13.5C9 8 13 4 20.5 3.5 20 11 16 15 10.5 16zm-2-3L5 12.5 7.5 9H11m0 6.5.5 3.5 3.5-2.5V13M5.5 16.5c-1.5 1-2 4-2 4s3-.5 4-2" />
    <circle cx="15" cy="9" r="1.5" />
  </>,
);
export const PartyPopper = /* @__PURE__ */ createIcon(
  "PartyPopper",
  <>
    <path d="M3.5 20.5 8 9l7 7zM13.5 3.5c1 1 1 2.3 0 3.3M17 13c1-1 2.3-1 3.3 0m-4.8-4.5 4-4" />
    {seed(10, 3.5, 1)}
    {seed(20.5, 9, 1)}
    {seed(19.5, 2.75, 1)}
  </>,
);
export const Briefcase = /* @__PURE__ */ createIcon(
  "Briefcase",
  <>
    <rect x="2.5" y="7" width="19" height="13.5" rx="3" />
    <path d="M8.5 7V5A1.5 1.5 0 0 1 10 3.5h4A1.5 1.5 0 0 1 15.5 5v2m-13 5.5h19" />
  </>,
);
export const Building2 = /* @__PURE__ */ createIcon(
  "Building2",
  <>
    <path d="M5 21.5V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16.5M16 9h2a2 2 0 0 1 2 2v10.5M3 21.5h18M9 21.5V18h3v3.5" />
    {seed(8.5, 7.5, 1)}
    {seed(12.5, 7.5, 1)}
    {seed(8.5, 11.5, 1)}
    {seed(12.5, 11.5, 1)}
  </>,
);
export const House = /* @__PURE__ */ createIcon(
  "House",
  <path d="M3.5 10.5 12 3.5l8.5 7V18a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3zm6 10.5v-5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21" />,
);
export const Shirt = /* @__PURE__ */ createIcon(
  "Shirt",
  <path d="M8.5 3.5 3 6.5 4.5 11 7 10v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 20V10l2.5 1L21 6.5l-5.5-3a3.5 3.5 0 0 1-7 0z" />,
);
export const Camera = /* @__PURE__ */ createIcon(
  "Camera",
  <>
    <path d="M3 9.5A2.5 2.5 0 0 1 5.5 7h1.8l1.4-2.1a1.5 1.5 0 0 1 1.2-.65h4.2a1.5 1.5 0 0 1 1.2.65L16.7 7h1.8A2.5 2.5 0 0 1 21 9.5V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <circle cx="12" cy="13" r="3.5" />
  </>,
);
export const Video = /* @__PURE__ */ createIcon(
  "Video",
  <>
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="m15.5 10 4.4-2.6a.8.8 0 0 1 1.1.7v7.8a.8.8 0 0 1-1.1.7L15.5 14" />
  </>,
);
export const Mic = /* @__PURE__ */ createIcon(
  "Mic",
  <>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4" />
  </>,
);
export const Music2 = /* @__PURE__ */ createIcon(
  "Music2",
  <>
    <circle cx="8" cy="17.5" r="3.5" />
    <path d="M11.5 17.5v-14l7 3.5" />
  </>,
);
export const Presentation = /* @__PURE__ */ createIcon(
  "Presentation",
  <path d="M2.5 3.5h19M4 3.5v9a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-9m-8 12v3m-3.5 3 3.5-3 3.5 3" />,
);
export const Tag = /* @__PURE__ */ createIcon(
  "Tag",
  <>
    <path d="M3.5 5.5v5.2a2 2 0 0 0 .6 1.4l8.3 8.3a2.1 2.1 0 0 0 3 0l4.7-4.7a2.1 2.1 0 0 0 0-3l-8.3-8.6a2 2 0 0 0-1.4-.6H5.5a2 2 0 0 0-2 2z" />
    {seed(7.75, 7.75, 1.5)}
  </>,
);
export const Tags = /* @__PURE__ */ createIcon(
  "Tags",
  <>
    <path d="M3 5v5a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l4-4a2 2 0 0 0 0-2.8L10.4 4.6A2 2 0 0 0 9 4H4a1 1 0 0 0-1 1zm11-1 6.6 6.6a2 2 0 0 1 0 2.8L16 18" />
    {seed(6.5, 7.5)}
  </>,
);
