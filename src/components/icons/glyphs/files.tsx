import { createIcon, seed } from "../create-icon";

/*
 * Files, folders and paper. A file is a rounded sheet with its top corner
 * sliced off (no folded flap): the set's own page.
 */

const sheet = "M14 3H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9z";
const file = (detail: string) => <path d={`${sheet}${detail}`} />;

export const File = /* @__PURE__ */ createIcon("File", <path d={sheet} />);
export const FileText = /* @__PURE__ */ createIcon("FileText", file("M8.5 10h3m-3 3.5h7m-7 3.5h7"));
export const FilePlus = /* @__PURE__ */ createIcon("FilePlus", file("M12 10.5v6m-3-3h6"));
export const FileUp = /* @__PURE__ */ createIcon(
  "FileUp",
  file("M12 17.5v-6M9.5 14l2.5-2.5 2.5 2.5"),
);
export const FileType = /* @__PURE__ */ createIcon("FileType", file("M9 11.5h6m-3 0v6"));
export const FileQuestion = /* @__PURE__ */ createIcon(
  "FileQuestion",
  <>
    {file("M10 12a2 2 0 1 1 2.7 1.9c-.4.15-.7.5-.7 1v.3")}
    {seed(12, 17.5, 1.1)}
  </>,
);
export const FileImage = /* @__PURE__ */ createIcon(
  "FileImage",
  <>
    {file("M20 16.5l-3-3L9.5 21")}
    {seed(9.5, 11.5, 1.5)}
  </>,
);
export const FileJson = /* @__PURE__ */ createIcon(
  "FileJson",
  file(
    "M10 11.5a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1m4-6a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1 1 1 0 0 0-1 1v1a1 1 0 0 1-1 1",
  ),
);
export const FileSpreadsheet = /* @__PURE__ */ createIcon(
  "FileSpreadsheet",
  <>
    <path d={sheet} />
    <rect x="8" y="11.5" width="8" height="6.5" rx="1" />
    <path d="M12 11.5V18m-4-3.25h8" />
  </>,
);

const folder =
  "M3 7a3 3 0 0 1 3-3h3.2a2 2 0 0 1 1.6.8l1 1.4a2 2 0 0 0 1.6.8H18a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z";

export const Folder = /* @__PURE__ */ createIcon("Folder", <path d={folder} />);
export const FolderPlus = /* @__PURE__ */ createIcon(
  "FolderPlus",
  <path d={`${folder}M12 10.5v6m-3-3h6`} />,
);
export const FolderOpen = /* @__PURE__ */ createIcon(
  "FolderOpen",
  <path d="M3 17.5V7a3 3 0 0 1 3-3h3.2a2 2 0 0 1 1.6.8l1 1.4a2 2 0 0 0 1.6.8H17a3 3 0 0 1 3 3v.5M3 17.5l2.4-6.2A2 2 0 0 1 7.3 10h13.2a1.5 1.5 0 0 1 1.4 2l-2.2 6a3 3 0 0 1-2.8 2H5.5A2.5 2.5 0 0 1 3 17.5z" />,
);
export const FolderInput = /* @__PURE__ */ createIcon(
  "FolderInput",
  <path d="M3 10V7a3 3 0 0 1 3-3h3.2a2 2 0 0 1 1.6.8l1 1.4a2 2 0 0 0 1.6.8H18a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3M2 13.5h9.5m-3-3 3 3-3 3" />,
);
export const Archive = /* @__PURE__ */ createIcon(
  "Archive",
  <>
    <rect x="2.5" y="3.5" width="19" height="5" rx="1.5" />
    <path d="M4.5 8.5V17a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3V8.5M10 12.5h4" />
  </>,
);
export const ArchiveRestore = /* @__PURE__ */ createIcon(
  "ArchiveRestore",
  <>
    <rect x="2.5" y="3.5" width="19" height="5" rx="1.5" />
    <path d="M4.5 8.5V17a3 3 0 0 0 3 3h2m10-11.5V17a3 3 0 0 1-3 3h-2m-2.5.5v-8M9.5 15l2.5-2.5 2.5 2.5" />
  </>,
);

const board = "M9 4.5H7a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7.5a3 3 0 0 0-3-3h-2";
const clip = <rect x="9" y="2.5" width="6" height="4" rx="1.5" />;

export const ClipboardCheck = /* @__PURE__ */ createIcon(
  "ClipboardCheck",
  <>
    {clip}
    <path d={`${board}M9 14l2 2 4-4`} />
  </>,
);
export const ClipboardList = /* @__PURE__ */ createIcon(
  "ClipboardList",
  <>
    {clip}
    <path d={`${board}M11.5 11.5h4m-4 4h4`} />
    {seed(8.75, 11.5, 1)}
    {seed(8.75, 15.5, 1)}
  </>,
);
export const ClipboardPaste = /* @__PURE__ */ createIcon(
  "ClipboardPaste",
  <>
    {clip}
    <path d={`${board}M12 10v6.5M9.5 14l2.5 2.5 2.5-2.5`} />
  </>,
);
export const ClipboardCopy = /* @__PURE__ */ createIcon(
  "ClipboardCopy",
  <>
    {clip}
    <path d="M15 4.5h2a3 3 0 0 1 3 3V9m0 7v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3h2m12 8h-9m3-3-3 3 3 3" />
  </>,
);
export const Copy = /* @__PURE__ */ createIcon(
  "Copy",
  <>
    <rect x="8.5" y="8.5" width="12.5" height="12.5" rx="3" />
    <path d="M15.5 5.5A2.5 2.5 0 0 0 13 3H5.5A2.5 2.5 0 0 0 3 5.5V13a2.5 2.5 0 0 0 2.5 2.5" />
  </>,
);

export const BookOpen = /* @__PURE__ */ createIcon(
  "BookOpen",
  <path d="M12 7v13.5M12 7c-1.5-1.7-4-2.5-7-2.5H4a1 1 0 0 0-1 1V17a1 1 0 0 0 1 1h1.5c2.6 0 5 .9 6.5 2.5 1.5-1.6 3.9-2.5 6.5-2.5H20a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1c-3 0-5.5.8-7 2.5z" />,
);
export const BookOpenText = /* @__PURE__ */ createIcon(
  "BookOpenText",
  <path d="M12 7v13.5M12 7c-1.5-1.7-4-2.5-7-2.5H4a1 1 0 0 0-1 1V17a1 1 0 0 0 1 1h1.5c2.6 0 5 .9 6.5 2.5 1.5-1.6 3.9-2.5 6.5-2.5H20a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1c-3 0-5.5.8-7 2.5zM6 8.5h3M6 12h3m6-3.5h3M15 12h3" />,
);

const notebook = (
  <>
    <rect x="5" y="2.5" width="15" height="19" rx="3" />
    <path d="M3 7h3.5M3 12h3.5M3 17h3.5" />
  </>
);

export const NotebookText = /* @__PURE__ */ createIcon(
  "NotebookText",
  <>
    {notebook}
    <path d="M10 8h6m-6 4h6m-6 4h4" />
  </>,
);
export const NotebookPen = /* @__PURE__ */ createIcon(
  "NotebookPen",
  <path d="M13.5 21.5H8a3 3 0 0 1-3-3v-13a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v2M3 7h3.5M3 12h3.5M3 17h3.5m15-5.4a1.6 1.6 0 0 0-2.3-2.3l-5.6 5.6-.6 2.9 2.9-.6z" />,
);
export const ScrollText = /* @__PURE__ */ createIcon(
  "ScrollText",
  <path d="M18 20.5H6.5a3 3 0 0 1-3-3V16a1 1 0 0 1 1-1H14a1 1 0 0 1 1 1v1.5a3 3 0 0 0 6 0V6a2.5 2.5 0 0 0-2.5-2.5H9A2.5 2.5 0 0 0 6.5 6v9M10 8h6.5M10 11.5h6.5" />,
);
export const Newspaper = /* @__PURE__ */ createIcon(
  "Newspaper",
  <>
    <path d="M4.5 20.5H18a3 3 0 0 0 3-3v-11a3 3 0 0 0-3-3h-8a3 3 0 0 0-3 3V18a2.5 2.5 0 0 1-5 0v-7.5A1.5 1.5 0 0 1 3.5 9H7m4 5.5h6m-6 3h4" />
    <rect x="11" y="7.5" width="6" height="3.5" rx="1" />
  </>,
);
export const Library = /* @__PURE__ */ createIcon(
  "Library",
  <path d="M4.5 4v16m4-13v13m4-15v15m3.5-13.5 4 13.5" />,
);
export const Paperclip = /* @__PURE__ */ createIcon(
  "Paperclip",
  <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.6 1.6 0 0 1-2.3-2.3l7.4-7.4" />,
);
export const Receipt = /* @__PURE__ */ createIcon(
  "Receipt",
  <path d="M5 21V6a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 6v15l-2.33-1.5-2.33 1.5L12 19.5 9.67 21l-2.34-1.5zm9.5-12.5h-3.75a1.5 1.5 0 0 0 0 3h2.5a1.5 1.5 0 0 1 0 3H9.5M12 7v9" />,
);
export const ReceiptText = /* @__PURE__ */ createIcon(
  "ReceiptText",
  <path d="M5 21V6a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 6v15l-2.33-1.5-2.33 1.5L12 19.5 9.67 21l-2.34-1.5zM9 8h6m-6 3.5h6M9 15h3.5" />,
);
export const Ticket = /* @__PURE__ */ createIcon(
  "Ticket",
  <path d="M3 9a3 3 0 0 1 0 6v2a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-2a3 3 0 0 1 0-6V7a2.5 2.5 0 0 0-2.5-2.5h-13A2.5 2.5 0 0 0 3 7zm11.5-1.5V9m0 2.25v1.5m0 2.25v1.5" />,
);
export const Vote = /* @__PURE__ */ createIcon(
  "Vote",
  <path d="M7 13.5V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8.5M3 15.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm6.5-7 1.75 1.75 3.25-3.5" />,
);
export const Stamp = /* @__PURE__ */ createIcon(
  "Stamp",
  <path d="M5 21h14M4.5 17.5v-2a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v2zm5-4V12c0-1-.6-1.8-1.3-2.5a4 4 0 1 1 7.6 0c-.7.7-1.3 1.5-1.3 2.5v1.5" />,
);
