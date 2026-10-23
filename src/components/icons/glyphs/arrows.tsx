import { createIcon, seed } from "../create-icon";

/* Arrows, chevrons and the moves between places: a 5-unit arrowhead, a 5.5-unit chevron. */

export const ArrowRight = /* @__PURE__ */ createIcon(
  "ArrowRight",
  <path d="M5 12h14M14 7l5 5-5 5" />,
);
export const ArrowLeft = /* @__PURE__ */ createIcon("ArrowLeft", <path d="M19 12H5m5-5-5 5 5 5" />);
export const ArrowUp = /* @__PURE__ */ createIcon("ArrowUp", <path d="M12 19V5M7 10l5-5 5 5" />);
export const ArrowDown = /* @__PURE__ */ createIcon(
  "ArrowDown",
  <path d="M12 5v14m-5-5 5 5 5-5" />,
);
export const ArrowUpRight = /* @__PURE__ */ createIcon(
  "ArrowUpRight",
  <path d="M7 17 17 7M9 7h8v8" />,
);
export const ArrowDownLeft = /* @__PURE__ */ createIcon(
  "ArrowDownLeft",
  <path d="M17 7 7 17m8 0H7V9" />,
);
export const ArrowDownRight = /* @__PURE__ */ createIcon(
  "ArrowDownRight",
  <path d="m7 7 10 10m0-8v8H9" />,
);
export const ArrowLeftRight = /* @__PURE__ */ createIcon(
  "ArrowLeftRight",
  <path d="M4.5 8H19M8.5 4l-4 4 4 4m11 4H5m10.5-4 4 4-4 4" />,
);
export const ArrowRightLeft = /* @__PURE__ */ createIcon(
  "ArrowRightLeft",
  <path d="M5 8h14.5m-4-4 4 4-4 4M19 16H4.5m4-4-4 4 4 4" />,
);
export const ArrowUpDown = /* @__PURE__ */ createIcon(
  "ArrowUpDown",
  <path d="M7 20V4M3.5 7.5 7 4l3.5 3.5M17 4v16m-3.5-3.5L17 20l3.5-3.5" />,
);
export const ArrowDownAZ = /* @__PURE__ */ createIcon(
  "ArrowDownAZ",
  <path d="M7 4v16m-3.5-3.5L7 20l3.5-3.5M14 10.5l2.5-6.5 2.5 6.5m-4.25-2h3.5M14 14h5l-5 6h5" />,
);
export const ArrowUpAZ = /* @__PURE__ */ createIcon(
  "ArrowUpAZ",
  <path d="M7 20V4M3.5 7.5 7 4l3.5 3.5M14 10.5l2.5-6.5 2.5 6.5m-4.25-2h3.5M14 14h5l-5 6h5" />,
);
export const ArrowDownToLine = /* @__PURE__ */ createIcon(
  "ArrowDownToLine",
  <path d="M12 3.5V15m-5-5 5 5 5-5M5 20.5h14" />,
);
export const ArrowUpToLine = /* @__PURE__ */ createIcon(
  "ArrowUpToLine",
  <path d="M5 3.5h14M12 20.5V9m-5 5 5-5 5 5" />,
);

export const ChevronDown = /* @__PURE__ */ createIcon(
  "ChevronDown",
  <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
);
export const ChevronUp = /* @__PURE__ */ createIcon(
  "ChevronUp",
  <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
);
export const ChevronLeft = /* @__PURE__ */ createIcon(
  "ChevronLeft",
  <path d="M14.5 6.5 9 12l5.5 5.5" />,
);
export const ChevronRight = /* @__PURE__ */ createIcon(
  "ChevronRight",
  <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
);
export const ChevronsUpDown = /* @__PURE__ */ createIcon(
  "ChevronsUpDown",
  <path d="m8 9 4-4 4 4m-8 6 4 4 4-4" />,
);
export const ChevronsDownUp = /* @__PURE__ */ createIcon(
  "ChevronsDownUp",
  <path d="m8 4 4 4 4-4M8 20l4-4 4 4" />,
);

export const ExternalLink = /* @__PURE__ */ createIcon(
  "ExternalLink",
  <path d="M10 6H7a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3m-4-10h6v6m0-6-8.5 8.5" />,
);
export const Undo2 = /* @__PURE__ */ createIcon(
  "Undo2",
  <path d="M9 13.5 4 8.5l5-5m-5 5h10a5.5 5.5 0 0 1 0 11h-3" />,
);
export const Redo2 = /* @__PURE__ */ createIcon(
  "Redo2",
  <path d="m15 13.5 5-5-5-5m5 5H10a5.5 5.5 0 0 0 0 11h3" />,
);
export const RotateCcw = /* @__PURE__ */ createIcon(
  "RotateCcw",
  <path d="M3.5 12A8.5 8.5 0 1 0 6 6L3.5 8.5m0-4.5v4.5H8" />,
);
export const RotateCw = /* @__PURE__ */ createIcon(
  "RotateCw",
  <path d="M20.5 12A8.5 8.5 0 1 1 18 6l2.5 2.5m0-4.5v4.5H16" />,
);
export const RefreshCw = /* @__PURE__ */ createIcon(
  "RefreshCw",
  <path d="M4 12a8 8 0 0 1 14-5.3L20 9m0-4.5V9h-4.5M20 12a8 8 0 0 1-14 5.3L4 15m0 4.5V15h4.5" />,
);
export const Repeat = /* @__PURE__ */ createIcon(
  "Repeat",
  <path d="m17 3 3.5 3.5L17 10M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5h13M7 21l-3.5-3.5L7 14m13-1.5V14a3.5 3.5 0 0 1-3.5 3.5h-13" />,
);
export const Repeat2 = /* @__PURE__ */ createIcon(
  "Repeat2",
  <path d="M2.5 9.5 6 6l3.5 3.5M13 18H9a3 3 0 0 1-3-3V6m15.5 8.5L18 18l-3.5-3.5M11 6h4a3 3 0 0 1 3 3v9" />,
);
export const History = /* @__PURE__ */ createIcon(
  "History",
  <path d="M3.5 12A8.5 8.5 0 1 0 6 6L3.5 8.5m0-4.5v4.5H8M12 7.5V12l3 2" />,
);
export const Merge = /* @__PURE__ */ createIcon(
  "Merge",
  <path d="m8 6.5 4-4 4 4m-4-4V12a4 4 0 0 1-1.2 2.8L5 20.5m14 0L14.5 16" />,
);
export const LocateFixed = /* @__PURE__ */ createIcon(
  "LocateFixed",
  <>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    {seed(12, 12, 2.25)}
  </>,
);
export const Maximize2 = /* @__PURE__ */ createIcon(
  "Maximize2",
  <path d="M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6" />,
);
export const LogOut = /* @__PURE__ */ createIcon(
  "LogOut",
  <path d="M9 20.5H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3h2m7 4 4.5 4.5-4.5 4.5m4.5-4.5H10" />,
);
export const DoorOpen = /* @__PURE__ */ createIcon(
  "DoorOpen",
  <>
    <path d="M3.5 20.5h17M6 20.5V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v14.5" />
    <path d="m6 4.5 7 2.5v13.5" />
    {seed(10.75, 13, 1)}
  </>,
);
export const Send = /* @__PURE__ */ createIcon(
  "Send",
  <path d="M20.5 3.5 3.5 10.5l7 3 3 7zm-10 10 10-10" />,
);
export const MousePointerClick = /* @__PURE__ */ createIcon(
  "MousePointerClick",
  <path d="m9 9 11.5 4-5 1.5-1.5 5zM6.5 2.5l.6 2.5M2.5 6.5l2.5.6M3.5 12l2-1.5M12 3.5l-1.5 2" />,
);
