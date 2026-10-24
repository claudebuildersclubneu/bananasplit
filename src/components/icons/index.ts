/*
 * Bananasplit's icon set ("Split"). Import icons from here:
 *
 *   import { CalendarDays, Plus, type IconComponent } from "@/components/icons";
 *
 * An icon takes the props of an <svg> plus size, strokeWidth and
 * absoluteStrokeWidth, and sits at the colour of the text around it. How the
 * glyphs are drawn, and how to add one, is in ./README.md.
 */

export { createIcon, type IconComponent, type IconProps } from "./create-icon";

export * from "./glyphs/arrows";
export * from "./glyphs/brand";
export * from "./glyphs/data";
export * from "./glyphs/editor";
export * from "./glyphs/files";
export * from "./glyphs/objects";
export * from "./glyphs/people";
export * from "./glyphs/status";
export * from "./glyphs/time";

/*
 * Second names for glyphs above. Settings, the sidebar, boards and saved
 * databases store an icon by name ("CheckSquare"), so every name those have
 * ever stored keeps resolving; new code uses the first name.
 */
export { ChartColumn as BarChart3, ChartGantt as GanttChart } from "./glyphs/data";
export { Code as CodeXml, PenLine as PencilLine } from "./glyphs/editor";
export { FilePlus as FilePlus2, FileType as FileType2 } from "./glyphs/files";
export { User as UserRound, Users as UsersRound } from "./glyphs/people";
export {
  CircleAlert as AlertCircle,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  SquareCheck as CheckSquare,
  SquareCheck as SquareCheckBig,
  Loader as Loader2,
  Ellipsis as MoreHorizontal,
  CirclePause as PauseCircle,
  CircleX as XCircle,
} from "./glyphs/status";
export { CalendarCheck as CalendarCheck2, CalendarX as CalendarX2 } from "./glyphs/time";

/* The names a shadcn/ui component imports, where a bare name would clash. */
export {
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronUp as ChevronUpIcon,
} from "./glyphs/arrows";
export { Image as ImageIcon, Search as SearchIcon } from "./glyphs/editor";
export { Check as CheckIcon, X as XIcon } from "./glyphs/status";
