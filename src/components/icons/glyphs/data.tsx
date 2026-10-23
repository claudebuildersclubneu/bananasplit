import { createIcon, seed } from "../create-icon";

/* Charts, data, devices and money. A chart's axes meet in a rounded corner. */

const axes = "M3.5 3.5v14a3 3 0 0 0 3 3h14";

export const ChartColumn = /* @__PURE__ */ createIcon(
  "ChartColumn",
  <path d={`${axes}M8.5 16.5V13m4.5 3.5v-9m4.5 9v-6`} />,
);
export const ChartNoAxesColumn = /* @__PURE__ */ createIcon(
  "ChartNoAxesColumn",
  <path d="M6 20.5V14m6 6.5V4m6 16.5v-11" />,
);
export const ChartBar = /* @__PURE__ */ createIcon(
  "ChartBar",
  <path d={`${axes}M8 8h5.5M8 12h10M8 16h7`} />,
);
export const ChartLine = /* @__PURE__ */ createIcon(
  "ChartLine",
  <path d={`${axes}M7.5 14.5l3.5-4 3 2.5 4.5-5.5`} />,
);
export const ChartGantt = /* @__PURE__ */ createIcon(
  "ChartGantt",
  <path d={`${axes}M8 7.5h4m-1 4.5h6.5m-8 4.5h5`} />,
);
/** A pie with its slice pulled out: the split. */
export const ChartPie = /* @__PURE__ */ createIcon(
  "ChartPie",
  <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12zm2.5-.2a6.2 6.2 0 0 1 6.2 6.2h-6.2z" />,
);
export const TrendingDown = /* @__PURE__ */ createIcon(
  "TrendingDown",
  <path d="m3 6.5 6 6 4-4 7.5 7.5m0-5.5V16H15" />,
);
export const Gauge = /* @__PURE__ */ createIcon(
  "Gauge",
  <>
    <path d="M4.2 18.5a9 9 0 1 1 15.6 0m-6.7-5.6 3.4-3.4" />
    {seed(12, 14, 1.75)}
  </>,
);

export const Database = /* @__PURE__ */ createIcon(
  "Database",
  <>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </>,
);
export const DatabaseZap = /* @__PURE__ */ createIcon(
  "DatabaseZap",
  <>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3 .9 0 1.8 0 2.6-.2M20 5.5V10M4 12c0 1.7 3.6 3 8 3m7-2.5-2.5 4h4l-2.5 4" />
  </>,
);
export const HardDrive = /* @__PURE__ */ createIcon(
  "HardDrive",
  <>
    <path d="M21.5 13h-19m2.8-7.2L2.5 13v4a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3v-4l-2.8-7.2a2 2 0 0 0-1.9-1.3H7.2a2 2 0 0 0-1.9 1.3z" />
    {seed(6.5, 16.5, 1)}
    {seed(9.5, 16.5, 1)}
  </>,
);
export const Cpu = /* @__PURE__ */ createIcon(
  "Cpu",
  <>
    <rect x="5" y="5" width="14" height="14" rx="3" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9.5 2.5V5m5-2.5V5m-5 14v2.5m5-2.5v2.5M2.5 9.5H5m-2.5 5H5m14-5h2.5m-2.5 5h2.5" />
  </>,
);
export const Monitor = /* @__PURE__ */ createIcon(
  "Monitor",
  <>
    <rect x="2.5" y="3.5" width="19" height="13" rx="3" />
    <path d="M8.5 20.5h7m-3.5-4v4" />
  </>,
);
export const Keyboard = /* @__PURE__ */ createIcon(
  "Keyboard",
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
    <path d="M8 14.5h8" />
    {seed(7, 10, 1)}
    {seed(10.33, 10, 1)}
    {seed(13.67, 10, 1)}
    {seed(17, 10, 1)}
  </>,
);
export const Command = /* @__PURE__ */ createIcon(
  "Command",
  <path d="M15 6.5v11a2.5 2.5 0 1 0 2.5-2.5h-11A2.5 2.5 0 1 0 9 17.5v-11A2.5 2.5 0 1 0 6.5 9h11A2.5 2.5 0 1 0 15 6.5" />,
);
export const Globe = /* @__PURE__ */ createIcon(
  "Globe",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9c2.5-2.5 3.8-5.5 3.8-9S14.5 5.5 12 3zM3 12h18" />
  </>,
);
export const Network = /* @__PURE__ */ createIcon(
  "Network",
  <>
    <rect x="9" y="2.5" width="6" height="5" rx="1.5" />
    <rect x="2.5" y="16.5" width="6" height="5" rx="1.5" />
    <rect x="15.5" y="16.5" width="6" height="5" rx="1.5" />
    <path d="M5.5 16.5V14a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5M12 7.5V12" />
  </>,
);
export const Layers = /* @__PURE__ */ createIcon(
  "Layers",
  <path d="M12 3 3 7.5l9 4.5 9-4.5zm-9 9 9 4.5 9-4.5m-18 4.5 9 4.5 9-4.5" />,
);
export const Plug = /* @__PURE__ */ createIcon(
  "Plug",
  <path d="M9 2.5v4m6-4v4m-9.5 0h13V11a6.5 6.5 0 0 1-13 0zm6.5 11v4" />,
);
export const PowerOff = /* @__PURE__ */ createIcon(
  "PowerOff",
  <path d="M18.4 6.6a8.5 8.5 0 0 1 1.5 9.6M5.6 6.6a8.5 8.5 0 0 0 9.8 13.9M12 2.5v5M3 3l18 18" />,
);
export const CloudUpload = /* @__PURE__ */ createIcon(
  "CloudUpload",
  <path d="M8 18.5H7a4.5 4.5 0 0 1-.9-8.9 6 6 0 0 1 11.7 1.1h.2a3.9 3.9 0 0 1 0 7.8H16m-4 2V13m-3 2.5 3-3 3 3" />,
);
export const CloudOff = /* @__PURE__ */ createIcon(
  "CloudOff",
  <path d="M7 18.5a4.5 4.5 0 0 1-.9-8.9m3.4-4a6 6 0 0 1 8.3 5.1h.2a3.9 3.9 0 0 1 2.4 7M17 18.5H7M3 3l18 18" />,
);

export const Banknote = /* @__PURE__ */ createIcon(
  "Banknote",
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="3" />
    <circle cx="12" cy="12" r="2.5" />
    {seed(6, 12, 1)}
    {seed(18, 12, 1)}
  </>,
);
export const DollarSign = /* @__PURE__ */ createIcon(
  "DollarSign",
  <path d="M12 2.5v19m4.5-15H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H6.5" />,
);
export const Wallet = /* @__PURE__ */ createIcon(
  "Wallet",
  <>
    <rect x="3" y="6.5" width="18" height="14" rx="3" />
    <path d="M17 6.5V5a1.5 1.5 0 0 0-1.9-1.4L6 6.5" />
    {seed(16.5, 13.5)}
  </>,
);
export const HandCoins = /* @__PURE__ */ createIcon(
  "HandCoins",
  <>
    <circle cx="16" cy="7.5" r="3.5" />
    <circle cx="7.5" cy="6.5" r="2" />
    <path d="M3 15.5 7 13h5.5a1.5 1.5 0 0 1 0 3H10m-7 5 3.5-2H14l6-4.5a1.4 1.4 0 0 0-1.9-2L14 15.5" />
  </>,
);
export const PiggyBank = /* @__PURE__ */ createIcon(
  "PiggyBank",
  <>
    <path d="M19 10.5c-.6-3.1-3.4-5.5-7.5-5.5C7 5 4 7.8 4 11.5c0 2.1 1 3.9 2.5 5.1V19a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-1h3v1a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-2.2c1-.6 1.8-1.4 2.3-2.3h1.7a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1zm-9.5-2h4M4 11.5c-1.4 0-2-1-2-2" />
    {seed(16, 10, 1)}
  </>,
);
export const Gem = /* @__PURE__ */ createIcon(
  "Gem",
  <path d="M6.5 3.5h11L21 9l-9 11.5L3 9zM3 9h18m-9 11.5L8.5 9l2-5.5m1.5 17L15.5 9l-2-5.5" />,
);
