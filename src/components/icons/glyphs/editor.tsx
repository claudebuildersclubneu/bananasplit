import { createIcon, seed } from "../create-icon";

/* Writing and laying out: text marks, lists, tables, panels and tools. */

export const Bold = /* @__PURE__ */ createIcon(
  "Bold",
  <path d="M6.5 12h7a3.75 3.75 0 0 1 0 7.5h-7V4.5h6a3.75 3.75 0 0 1 0 7.5" />,
);
export const Italic = /* @__PURE__ */ createIcon(
  "Italic",
  <path d="M18.5 4.5h-8m3 15h-8m9-15-5 15" />,
);
export const Underline = /* @__PURE__ */ createIcon(
  "Underline",
  <path d="M6.5 4v6a5.5 5.5 0 0 0 11 0V4M5 20.5h14" />,
);
export const Strikethrough = /* @__PURE__ */ createIcon(
  "Strikethrough",
  <path d="M16.5 6.5c-.8-1.3-2.3-2-4.3-2-2.6 0-4.4 1.3-4.4 3.3 0 1.6 1 2.6 3.2 3.2M3.5 12h17M15 14.5c.6.5.9 1.2.9 2 0 2-1.8 3.3-4.4 3.3-2.2 0-3.8-.8-4.6-2.3" />,
);
export const Type = /* @__PURE__ */ createIcon(
  "Type",
  <path d="M5 6.5v-2h14v2m-7-2v15m-2.5 0h5" />,
);
export const Heading1 = /* @__PURE__ */ createIcon(
  "Heading1",
  <path d="M4 5.5v13m8-13v13M4 12h8m4.5-1 3-2.5v10" />,
);
export const Heading2 = /* @__PURE__ */ createIcon(
  "Heading2",
  <path d="M4 5.5v13m8-13v13M4 12h8m9 6.5h-4.5c0-4.25 4.5-3 4.5-6.5a2.25 2.25 0 0 0-4.4-.6" />,
);
export const Heading3 = /* @__PURE__ */ createIcon(
  "Heading3",
  <path d="M4 5.5v13m8-13v13M4 12h8m4.6-2.4a2.3 2.3 0 1 1 1.7 3.8 2.6 2.6 0 1 1-1.8 4.4" />,
);
export const Pilcrow = /* @__PURE__ */ createIcon(
  "Pilcrow",
  <path d="M13 4v16m4-16v16m2-16H9.5a4.5 4.5 0 0 0 0 9H13" />,
);
export const Quote = /* @__PURE__ */ createIcon(
  "Quote",
  <path d="M4 17.5c3 0 5-2 5-5.5V7.5A1.5 1.5 0 0 0 7.5 6h-2A1.5 1.5 0 0 0 4 7.5v2A1.5 1.5 0 0 0 5.5 11H9m5 6.5c3 0 5-2 5-5.5V7.5A1.5 1.5 0 0 0 17.5 6h-2A1.5 1.5 0 0 0 14 7.5v2a1.5 1.5 0 0 0 1.5 1.5H19" />,
);
export const AlignLeft = /* @__PURE__ */ createIcon(
  "AlignLeft",
  <path d="M3.5 6h17m-17 6h11m-11 6h14" />,
);
export const Code = /* @__PURE__ */ createIcon(
  "Code",
  <path d="M8.5 7.5 4 12l4.5 4.5m7-9L20 12l-4.5 4.5m-2-11-3 13" />,
);
export const SquareCode = /* @__PURE__ */ createIcon(
  "SquareCode",
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M10 9.5 7.5 12l2.5 2.5m4-5 2.5 2.5-2.5 2.5" />
  </>,
);
export const Hash = /* @__PURE__ */ createIcon(
  "Hash",
  <path d="M9.5 4 8 20m8-16-1.5 16M4.5 9h15M4 15h15" />,
);

export const List = /* @__PURE__ */ createIcon(
  "List",
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    {seed(4.75, 6)}
    {seed(4.75, 12)}
    {seed(4.75, 18)}
  </>,
);
export const ListOrdered = /* @__PURE__ */ createIcon(
  "ListOrdered",
  <path d="M10.5 6H20m-9.5 6H20m-9.5 6H20M4.5 4H6v5m-1.5 0h3m0 11H4.2c0-1.1 3.3-2.1 3.3-3.7a1.6 1.6 0 0 0-3-.8" />,
);
export const ListChecks = /* @__PURE__ */ createIcon(
  "ListChecks",
  <path d="M13 7h7.5M13 12h7.5M13 17h7.5M3.5 7l2 2L9 5.5m-5.5 11.5 2 2L9 15.5" />,
);
export const ListTodo = /* @__PURE__ */ createIcon(
  "ListTodo",
  <>
    <rect x="3.5" y="4" width="5.5" height="5.5" rx="1.5" />
    <path d="M13 6.75h7.5M13 12h7.5M13 17.25h7.5M3.5 17l2 2L9 15.5" />
  </>,
);
export const ListPlus = /* @__PURE__ */ createIcon(
  "ListPlus",
  <path d="M3.5 6h12m-12 6h12m-12 6h7m7.5-3.5v7M14.5 18h7" />,
);
export const ListFilter = /* @__PURE__ */ createIcon(
  "ListFilter",
  <path d="M3.5 6.5h17m-14 5.5h11m-7.5 5.5h4" />,
);
export const ListTree = /* @__PURE__ */ createIcon(
  "ListTree",
  <path d="M9.5 6h11M14 12h6.5M14 18h6.5M4.5 4.5V15a3 3 0 0 0 3 3h3m-6-9a3 3 0 0 0 3 3h3" />,
);
export const Menu = /* @__PURE__ */ createIcon("Menu", <path d="M4 6h16M4 12h16M4 18h10" />);
export const Filter = /* @__PURE__ */ createIcon(
  "Filter",
  <path d="M3.5 4.5h17l-6.5 8V19l-4 2v-8.5z" />,
);
export const SlidersHorizontal = /* @__PURE__ */ createIcon(
  "SlidersHorizontal",
  <>
    <path d="M3.5 6h8m4 0h5m-17 6h3m4 0h10m-17 6h11m4 0h2" />
    <circle cx="13.5" cy="6" r="2" />
    <circle cx="8.5" cy="12" r="2" />
    <circle cx="16.5" cy="18" r="2" />
  </>,
);

const frame = <rect x="3" y="3" width="18" height="18" rx="3" />;

export const Table = /* @__PURE__ */ createIcon(
  "Table",
  <>
    {frame}
    <path d="M3 9h18M3 15h18M10 3v18" />
  </>,
);
export const Table2 = /* @__PURE__ */ createIcon(
  "Table2",
  <>
    {frame}
    <path d="M3 9h18M3 15h18M9 3v18m6-18v18" />
  </>,
);
export const Sheet = /* @__PURE__ */ createIcon(
  "Sheet",
  <>
    {frame}
    <path d="M3 9h18M3 15h18M9 9v12m6-12v12" />
  </>,
);
export const TableCellsMerge = /* @__PURE__ */ createIcon(
  "TableCellsMerge",
  <>
    {frame}
    <path d="M12 3v6m0 6v6M3 9h18M3 15h18" />
  </>,
);
export const TableColumnsSplit = /* @__PURE__ */ createIcon(
  "TableColumnsSplit",
  <>
    {frame}
    <path d="M12 3v18M8.5 9.5 6 12l2.5 2.5m7-5L18 12l-2.5 2.5" />
  </>,
);
export const TableRowsSplit = /* @__PURE__ */ createIcon(
  "TableRowsSplit",
  <>
    {frame}
    <path d="M3 12h18M9.5 8.5 12 6l2.5 2.5m-5 7L12 18l2.5-2.5" />
  </>,
);
export const Columns2 = /* @__PURE__ */ createIcon(
  "Columns2",
  <>
    {frame}
    <path d="M12 3v18" />
  </>,
);
export const Columns3 = /* @__PURE__ */ createIcon(
  "Columns3",
  <>
    {frame}
    <path d="M9 3v18m6-18v18" />
  </>,
);
export const Rows3 = /* @__PURE__ */ createIcon(
  "Rows3",
  <>
    {frame}
    <path d="M3 9h18M3 15h18" />
  </>,
);
export const BetweenHorizontalStart = /* @__PURE__ */ createIcon(
  "BetweenHorizontalStart",
  <>
    <rect x="8.5" y="3.5" width="12" height="6.5" rx="2" />
    <rect x="8.5" y="14" width="12" height="6.5" rx="2" />
    <path d="m3 9 3 3-3 3" />
  </>,
);
export const BetweenHorizontalEnd = /* @__PURE__ */ createIcon(
  "BetweenHorizontalEnd",
  <>
    <rect x="3.5" y="3.5" width="12" height="6.5" rx="2" />
    <rect x="3.5" y="14" width="12" height="6.5" rx="2" />
    <path d="m21 9-3 3 3 3" />
  </>,
);
export const BetweenVerticalStart = /* @__PURE__ */ createIcon(
  "BetweenVerticalStart",
  <>
    <rect x="3.5" y="8.5" width="6.5" height="12" rx="2" />
    <rect x="14" y="8.5" width="6.5" height="12" rx="2" />
    <path d="m9 3 3 3 3-3" />
  </>,
);
export const BetweenVerticalEnd = /* @__PURE__ */ createIcon(
  "BetweenVerticalEnd",
  <>
    <rect x="3.5" y="3.5" width="6.5" height="12" rx="2" />
    <rect x="14" y="3.5" width="6.5" height="12" rx="2" />
    <path d="m9 21 3-3 3 3" />
  </>,
);

export const LayoutDashboard = /* @__PURE__ */ createIcon(
  "LayoutDashboard",
  <>
    <rect x="3.5" y="3.5" width="7" height="9" rx="2.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="2.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="2.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="2.5" />
  </>,
);
export const LayoutGrid = /* @__PURE__ */ createIcon(
  "LayoutGrid",
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.5" />
  </>,
);
export const LayoutTemplate = /* @__PURE__ */ createIcon(
  "LayoutTemplate",
  <>
    <rect x="3.5" y="3.5" width="17" height="7" rx="2.5" />
    <rect x="3.5" y="13.5" width="9" height="7" rx="2.5" />
    <rect x="15.5" y="13.5" width="5" height="7" rx="2.5" />
  </>,
);
export const PanelLeft = /* @__PURE__ */ createIcon(
  "PanelLeft",
  <>
    {frame}
    <path d="M9 3v18" />
  </>,
);
export const PanelTop = /* @__PURE__ */ createIcon(
  "PanelTop",
  <>
    {frame}
    <path d="M3 9h18" />
  </>,
);
export const PanelRightClose = /* @__PURE__ */ createIcon(
  "PanelRightClose",
  <>
    {frame}
    <path d="M15 3v18M8.5 9.5 11 12l-2.5 2.5" />
  </>,
);
export const PanelRightOpen = /* @__PURE__ */ createIcon(
  "PanelRightOpen",
  <>
    {frame}
    <path d="M15 3v18m-4-11.5L8.5 12l2.5 2.5" />
  </>,
);
export const ScanLine = /* @__PURE__ */ createIcon(
  "ScanLine",
  <path d="M3.5 8V6.5a3 3 0 0 1 3-3H8m8 0h1.5a3 3 0 0 1 3 3V8m0 8v1.5a3 3 0 0 1-3 3H16m-8 0H6.5a3 3 0 0 1-3-3V16m4-4h9" />,
);
export const Shapes = /* @__PURE__ */ createIcon(
  "Shapes",
  <>
    <path d="m7.5 3.5 4 7h-8z" />
    <circle cx="17" cy="7" r="3.75" />
    <rect x="8.25" y="13" width="7.5" height="7.5" rx="2" />
  </>,
);
export const Image = /* @__PURE__ */ createIcon(
  "Image",
  <>
    {frame}
    <path d="m21 15-3.6-3.6a1.5 1.5 0 0 0-2.1 0L5.5 21" />
    {seed(8.75, 8.75, 1.75)}
  </>,
);
/** A picture with its top-right corner cut away for a badge. */
const cutPicture =
  "M20.5 12v5.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3H12m8.5 12-3.1-3.1a1.5 1.5 0 0 0-2.1 0L6 20.5";

export const ImagePlus = /* @__PURE__ */ createIcon(
  "ImagePlus",
  <>
    <path d={`${cutPicture}M18 2.5v6m-3-3h6`} />
    {seed(8.75, 8.75, 1.75)}
  </>,
);
export const ImageUp = /* @__PURE__ */ createIcon(
  "ImageUp",
  <>
    <path d={`${cutPicture}M18 9V2.5m-3 3 3-3 3 3`} />
    {seed(8.75, 8.75, 1.75)}
  </>,
);

export const Pencil = /* @__PURE__ */ createIcon(
  "Pencil",
  <path d="M15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L8.5 19.5 4 20.5l1-4.5zM14 6l4 4" />,
);
export const PenLine = /* @__PURE__ */ createIcon(
  "PenLine",
  <path d="M12 20.5h8.5M16 4.5a2.15 2.15 0 0 1 3 3L8 18.5l-4 1 1-4z" />,
);
export const SquarePen = /* @__PURE__ */ createIcon(
  "SquarePen",
  <path d="M20 12.5V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h5.5m6-.5a2.15 2.15 0 0 1 3 3L12 15l-4 1 1-4z" />,
);
export const PenTool = /* @__PURE__ */ createIcon(
  "PenTool",
  <>
    <path d="m3.5 3.5 11 3 2.5 6.5-4 4-6.5-2.5zm0 0 6 6M13 17l3.5 3.5 4-4L17 13" />
    <circle cx="11" cy="11" r="1.75" />
  </>,
);
export const Eraser = /* @__PURE__ */ createIcon(
  "Eraser",
  <path d="M20.5 20.5h-12m0 0-4.4-4.4a2 2 0 0 1 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l3.8 3.8a2 2 0 0 1 0 2.8l-9.4 9.8M8.5 9l7 7" />,
);
export const Scissors = /* @__PURE__ */ createIcon(
  "Scissors",
  <>
    <circle cx="6" cy="6" r="2.75" />
    <circle cx="6" cy="18" r="2.75" />
    <path d="M20 4.5 8.1 16m0-8 4.4 4.2m2.1 2L20 19.5" />
  </>,
);
export const BrushCleaning = /* @__PURE__ */ createIcon(
  "BrushCleaning",
  <path d="M10 4a2 2 0 0 1 4 0v5.5h3.5a2 2 0 0 1 2 2V14h-15v-2.5a2 2 0 0 1 2-2H10zm-5.5 10-1 6a1.3 1.3 0 0 0 1.3 1.5h14.4a1.3 1.3 0 0 0 1.3-1.5l-1-6M9 21.5l.5-3.5m5.5 3.5-.5-3.5" />,
);
export const Palette = /* @__PURE__ */ createIcon(
  "Palette",
  <>
    <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2A4.5 4.5 0 0 0 21 11c0-4.4-4-8-9-8z" />
    {seed(7.5, 11.5)}
    {seed(9.5, 7.25)}
    {seed(14.25, 6.75)}
    {seed(17.25, 10.25)}
  </>,
);
export const Save = /* @__PURE__ */ createIcon(
  "Save",
  <path d="M15.5 3.5h-9a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-9zm-8 17v-5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v5m-9-17V7a1 1 0 0 0 1 1h5" />,
);
export const Trash2 = /* @__PURE__ */ createIcon(
  "Trash2",
  <path d="M3.5 6h17M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6m-9.5 0 .9 12.2a3 3 0 0 0 3 2.8h5.2a3 3 0 0 0 3-2.8L18.5 6M10 10.5v6m4-6v6" />,
);
export const Download = /* @__PURE__ */ createIcon(
  "Download",
  <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4 15.5V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1.5" />,
);
export const Upload = /* @__PURE__ */ createIcon(
  "Upload",
  <path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8M4 15.5V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1.5" />,
);
export const Printer = /* @__PURE__ */ createIcon(
  "Printer",
  <>
    <path d="M7 8V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V8M7 17H5.5A2.5 2.5 0 0 1 3 14.5V11a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3.5a2.5 2.5 0 0 1-2.5 2.5H17" />
    <rect x="7" y="14" width="10" height="7" rx="1.5" />
    {seed(17.5, 11.25, 1)}
  </>,
);
export const ZoomIn = /* @__PURE__ */ createIcon(
  "ZoomIn",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20.5 20.5-5-5m-5-7.5v5M8 10.5h5" />
  </>,
);
export const ZoomOut = /* @__PURE__ */ createIcon(
  "ZoomOut",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20.5 20.5-5-5M8 10.5h5" />
  </>,
);
export const Search = /* @__PURE__ */ createIcon(
  "Search",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20.5 20.5-5-5" />
  </>,
);
export const SearchX = /* @__PURE__ */ createIcon(
  "SearchX",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20.5 20.5-5-5m-7-7 4 4m0-4-4 4" />
  </>,
);
export const Eye = /* @__PURE__ */ createIcon(
  "Eye",
  <>
    <path d="M2.5 12C5 7.3 8.3 5 12 5s7 2.3 9.5 7c-2.5 4.7-5.8 7-9.5 7s-7-2.3-9.5-7z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const EyeOff = /* @__PURE__ */ createIcon(
  "EyeOff",
  <path d="M10.7 5.1A9.6 9.6 0 0 1 12 5c3.7 0 7 2.3 9.5 7-.6 1.1-1.2 2-1.9 2.9M6.6 6.6C4.9 7.7 3.6 9.5 2.5 12c2.5 4.7 5.8 7 9.5 7 1.9 0 3.7-.6 5.3-1.8M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />,
);
export const Link = /* @__PURE__ */ createIcon(
  "Link",
  <path d="M10.5 13.5a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3m1 3a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3" />,
);
export const Link2 = /* @__PURE__ */ createIcon(
  "Link2",
  <path d="M9 17H7.5a5 5 0 0 1 0-10H9m6 0h1.5a5 5 0 0 1 0 10H15m-6.5-5h7" />,
);
export const Unlink = /* @__PURE__ */ createIcon(
  "Unlink",
  <path d="M9 17H7.5a5 5 0 0 1 0-10H9m6 0h1.5a5 5 0 0 1 0 10H15M12 3.5v2m0 13v2" />,
);
