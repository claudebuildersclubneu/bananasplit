import {
  CalendarDays,
  Check,
  FolderOpen,
  ListChecks,
  Pin,
  Plus,
  Vote,
  type LucideIcon,
} from "lucide-react";

import { ArrowRight } from "@/components/brand/arrows";
import { CoreMark } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

import { AvatarStack } from "./avatar-stack";
import { CONTAINER, SectionIntro } from "./section-title";

/** The apps a club board juggles today, crossed out on the way in. */
const REPLACED_APPS = [
  "Luma",
  "When2meet",
  "Trello",
  "Budget spreadsheet",
  "Receipts in the group chat",
  "Airtable",
  "Google Drive",
] as const;

/** Tasks' three layouts, plus due dates on the club calendar. */
const TASK_VIEWS = ["Board", "Week", "Table", "Calendar"] as const;

const CHAT_RESULTS = [
  "Event added: Spring Showcase, Apr 12",
  "Task: Book venue → Maya",
  "Task: Snacks → Jay",
] as const;

const DATA_SOURCES = [
  "Google Sheets",
  "Airtable",
  "Notion",
  "Excel",
  "Supabase",
  "Postgres",
  "CSV import",
] as const;

/** The home board's widgets, as a member might arrange them. */
const WIDGETS: readonly { icon: LucideIcon; label: string; meta: string }[] = [
  { icon: ListChecks, label: "My tasks", meta: "6 open, 1 due today" },
  { icon: CalendarDays, label: "Up next", meta: "General meeting, Thu" },
  { icon: Vote, label: "Open polls", meta: "2 waiting on you" },
  { icon: Pin, label: "Pinned", meta: "Budget, GBM agenda" },
  { icon: FolderOpen, label: "Files", meta: "Sponsor deck v2" },
];

/** Theme presets a club can start from: the first is the one chosen. */
const THEME_SWATCHES = [
  { name: "Moonstone", base: "bg-night", dot: "bg-banana" },
  { name: "Banana cream", base: "bg-cream", dot: "bg-banana" },
  { name: "Pine", base: "bg-pine", dot: "bg-cream" },
  { name: "Brick", base: "bg-brick", dot: "bg-cream" },
  { name: "Navy", base: "bg-navy", dot: "bg-cream" },
] as const;

const PINNED = ["Budget", "Showcase tasks", "Meeting notes"] as const;

const TEAMS = ["Events", "Treasury"] as const;

/** A card tile: the surface, its top highlight and a hairline ring. */
const CARD_TILE = "rounded-card bg-card text-card-foreground edge ring-1 ring-foreground/6";

/**
 * Block tiles: a block card's colours (globals.css block-*), each used for
 * the one meaning it has in the app: answer for the main thing (Tasks),
 * quiet for something running in the background (AI), goal for progress
 * (handing over).
 */
const BLOCK_TILE = {
  answer:
    "rounded-card bg-block-answer text-block-answer-foreground [--meta:var(--block-answer-meta)] [--ring-bg:var(--block-answer)]",
  quiet:
    "rounded-card bg-block-quiet text-block-quiet-foreground ring-1 ring-inset ring-block-quiet-foreground/10 [--meta:var(--block-quiet-meta)] [--ring-bg:var(--block-quiet)]",
  goal: "rounded-card bg-block-goal text-block-goal-foreground [--meta:var(--block-goal-meta)] [--ring-bg:var(--block-goal)]",
} as const;

/** A chip on a block: a tint of the block's own text colour. */
const ON_BLOCK_CHIP = "bg-[color-mix(in_oklab,currentColor_14%,transparent)]";

/**
 * On phones the tiles are one swipeable row instead of a long stack: each
 * tile is most of the screen wide, so the next one peeks in, and snaps into
 * place.
 */
const SLIDE = "max-sm:w-[86%] max-sm:flex-none max-sm:snap-start";

/** A row of tiles; on phones its tiles join the one swipeable row. */
const ROW = "flex flex-wrap gap-4.5 max-sm:contents";

/** The two-column tiles: copy beside a sample, stacked once two 260px columns don't fit. */
const SPLIT_TILE =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-center gap-7 p-[clamp(22px,3vw,36px)] max-sm:content-start max-sm:gap-5";

/** A tile's headline: the display face. */
const TILE_HEADLINE = "display-title tracking-[-0.03em] text-balance";

/**
 * A tile's small label, with the app it replaces as a chip on the right of
 * the row (wrapping below it when the tile is narrow). On a block it takes
 * the block's meta colour.
 */
function TileTitle({
  children,
  replaces,
  onBlock = false,
  onMuted = false,
}: {
  children: React.ReactNode;
  replaces?: string;
  onBlock?: boolean;
  /** On a muted tile, the chip takes the card colour so it still shows. */
  onMuted?: boolean;
}) {
  const label = (
    <span
      className={cn(
        "relative text-[14px] font-semibold",
        onBlock ? "text-(--meta)" : "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
  if (!replaces) return label;
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      {label}
      <span
        className={cn(
          "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap",
          onBlock
            ? cn(ON_BLOCK_CHIP, "text-(--meta)")
            : cn(onMuted ? "bg-card" : "bg-muted", "text-muted-foreground"),
        )}
      >
        Replaces {replaces}
      </span>
    </div>
  );
}

/**
 * "Every scoop your club needs.": the apps it replaces, then a bento of
 * features: cards, with block colours for the three loudest tiles (a
 * swipeable row on phones).
 */
export function FeatureBoard() {
  return (
    <section
      id="features"
      className={cn(CONTAINER, "flex flex-col gap-10 pt-16 pb-16 sm:gap-14 sm:pt-20 sm:pb-28")}
    >
      <SectionIntro title="Every scoop your club needs." className="max-w-[400px] text-pretty">
        Most clubs juggle seven apps, each with its own login and member list. Bananasplit puts
        events, money and data in one workspace with one member list and one bill.
      </SectionIntro>

      <div className="-mt-4 flex flex-wrap items-center gap-1.5 sm:-mt-6 sm:gap-2">
        {REPLACED_APPS.map((app) => (
          <span
            key={app}
            className="bg-muted text-muted-foreground inline-flex h-7 items-center rounded-full px-3 text-[13px] line-through decoration-current/60 sm:h-8 sm:text-[14px]"
          >
            {app}
          </span>
        ))}
        <span className="text-muted-foreground flex px-1">
          <ArrowRight />
        </span>
        <span className="bg-primary text-primary-foreground inline-flex h-7 items-center gap-2 rounded-full pr-3 pl-1.5 text-[13px] font-semibold sm:h-8 sm:pr-3.5 sm:text-[14px]">
          <CoreMark size={20} />
          One workspace
        </span>
      </div>

      <div className="flex flex-col gap-4.5 max-sm:-mx-4 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:[scrollbar-width:none] max-sm:flex-row max-sm:gap-3 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2">
        <div className={ROW}>
          <OverviewTile />
          <div className="flex flex-[1_1_300px] flex-col gap-4.5 max-sm:contents">
            <TasksTile />
            <CalendarTile />
          </div>
        </div>
        <div className={ROW}>
          <EventsTile />
          <AiTile />
        </div>
        <div className={ROW}>
          <NotesTile />
          <DatabasesTile />
        </div>
        <div className={ROW}>
          <CustomizationTile />
          <PeopleTile />
        </div>
      </div>
    </section>
  );
}

/** The wide tile: a member's home board, five widgets and a free slot. */
function OverviewTile() {
  return (
    <div
      className={cn(
        CARD_TILE,
        SLIDE,
        "flex flex-[2_1_520px] flex-col gap-4 p-[clamp(22px,3vw,36px)]",
      )}
    >
      <TileTitle>Overview</TileTitle>
      <h3
        className={cn(TILE_HEADLINE, "max-w-[520px] text-[clamp(28px,3.4vw,44px)] leading-[1.04]")}
      >
        Everyone opens to what matters to them.
      </h3>
      <p className="text-muted-foreground max-w-[460px] text-[15px] leading-[1.55] text-pretty sm:text-[16px]">
        Each member arranges a home board of widgets: tasks due this week, the next meeting, pinned
        notes, files and people.
      </p>
      <div
        aria-hidden="true"
        className="mt-auto grid grid-cols-2 gap-2.5 pt-3 sm:grid-cols-3 sm:gap-3"
      >
        {WIDGETS.map(({ icon: Icon, label, meta }, i) => (
          <div
            key={label}
            className={cn(
              "bg-muted rounded-tile flex min-w-0 flex-col gap-3 p-3.5",
              i > 3 && "max-sm:hidden",
            )}
          >
            <span className="bg-card grid size-9 place-items-center rounded-full">
              <Icon className="size-[18px]" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[14px] font-semibold">{label}</span>
              <span className="text-muted-foreground truncate text-[12px]">{meta}</span>
            </span>
          </div>
        ))}
        <div className="hatch bg-muted/50 rounded-tile text-muted-foreground hidden items-center justify-center gap-1.5 p-3.5 text-[13px] font-medium sm:flex">
          <Plus className="size-4" />
          Add a widget
        </div>
      </div>
    </div>
  );
}

function TasksTile() {
  return (
    <div
      className={cn(
        BLOCK_TILE.answer,
        SLIDE,
        "relative flex flex-[1_0_auto] flex-col gap-2 overflow-hidden p-6 sm:p-8",
      )}
    >
      <TileTitle onBlock replaces="Trello">
        Tasks
      </TileTitle>
      <div className="relative mt-auto flex items-end gap-3.5 pt-4">
        <span className="numeral text-[clamp(96px,9vw,124px)] leading-[0.78] tracking-[-0.05em]">
          {TASK_VIEWS.length}
        </span>
        <span className="pb-0.5 text-[19px] leading-[1.25] font-semibold">
          ways to see
          <br />
          the same work
        </span>
      </div>
      <p className="relative mt-2.5 text-[15px] leading-[1.5] text-(--meta)">
        Assign it once and nothing slips between meetings.
      </p>
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {TASK_VIEWS.map((view) => (
          <span
            key={view}
            className={cn(
              ON_BLOCK_CHIP,
              "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold",
            )}
          >
            {view}
          </span>
        ))}
      </div>
    </div>
  );
}

function CalendarTile() {
  return (
    <div className={cn(CARD_TILE, SLIDE, "flex flex-[1_0_auto] flex-col gap-2.5 p-6 sm:p-8")}>
      <TileTitle replaces="When2meet">Calendar</TileTitle>
      <div
        className={cn(TILE_HEADLINE, "mt-auto pt-4 text-[clamp(26px,2.4vw,34px)] leading-[1.06]")}
      >
        Find a time, then put it on everyone&apos;s calendar.
      </div>
      <p className="text-muted-foreground text-[15px] leading-[1.55] text-pretty">
        Availability polls pick the time, and every meeting syncs both ways with Google Calendar.
      </p>
    </div>
  );
}

/** RSVPs and events, with a sample event card. */
function EventsTile() {
  return (
    <div className={cn(CARD_TILE, SPLIT_TILE, SLIDE, "flex-[1.6_1_460px]")}>
      <div className="flex flex-col gap-3.5">
        <TileTitle replaces="Luma">RSVPs and events</TileTitle>
        <h3 className={cn(TILE_HEADLINE, "text-[clamp(30px,3.4vw,44px)] leading-[1.04]")}>
          You don&apos;t need Luma anymore.
        </h3>
        <p className="text-muted-foreground text-[16px] leading-[1.55] text-pretty">
          Public event pages with RSVPs, waitlists, reminders and QR check-in. Every guest lands in
          your member list, so you can see who keeps coming back.
        </p>
      </div>
      <div
        aria-hidden="true"
        className="bg-background rounded-block flex flex-col gap-3.5 p-4 max-sm:gap-3"
      >
        <div className="bg-block-quiet text-block-quiet-foreground glow-corner rounded-tile flex h-24 items-end p-3 max-sm:hidden">
          <span className="bg-card/85 text-foreground rounded-full px-2.5 py-1 text-[12px] font-semibold">
            Fri, 7:00 PM
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-semibold">Spring Showcase</span>
          <span className="text-muted-foreground text-[13px]">Student Union, Room 204</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <AvatarStack
            names={["Maya Patel", "Jay Kim", "Sara Ruiz", "Tom Baker"]}
            ring="ring-background"
          />
          <span className="text-[13px] font-semibold whitespace-nowrap">86 going</span>
          <span className="text-muted-foreground text-[13px] whitespace-nowrap">
            · 12 on waitlist
          </span>
        </div>
        <span className={cn(pill({ size: "md" }), "w-full cursor-default")}>RSVP</span>
      </div>
    </div>
  );
}

/** A typed request turned into an event and tasks, on the quiet block. */
function AiTile() {
  return (
    <div
      className={cn(
        BLOCK_TILE.quiet,
        SLIDE,
        "glow-corner relative flex flex-[1_1_320px] flex-col gap-3.5 overflow-hidden p-6 sm:p-8",
      )}
    >
      <TileTitle onBlock>AI built in</TileTitle>
      <h3 className={cn(TILE_HEADLINE, "relative text-[clamp(30px,3vw,40px)] leading-[1.05]")}>
        Type it. It&apos;s sorted.
      </h3>
      <div aria-hidden="true" className="relative my-1.5 flex flex-col gap-2">
        <span className="bg-brand-accent text-brand-accent-foreground max-w-[90%] self-end rounded-[18px_18px_6px_18px] px-3.5 py-2.5 text-[14px] leading-[1.45]">
          Showcase is April 12. Maya books the venue, Jay does snacks.
        </span>
        <div
          className={cn(
            ON_BLOCK_CHIP,
            "flex w-[90%] flex-col gap-1.5 self-start rounded-[18px_18px_18px_6px] p-3",
          )}
        >
          {CHAT_RESULTS.map((result) => (
            <span key={result} className="flex items-center gap-2 text-[13px]">
              <Check className="size-3.5 flex-none" strokeWidth={2.5} />
              {result}
            </span>
          ))}
        </div>
      </div>
      <p className="relative mt-auto text-[15px] leading-[1.55] text-pretty text-(--meta)">
        Create tasks and calendar events just by typing. AI also sorts your task lists, tidies
        databases and lays out the org chart. Connect the model you prefer with your own API key.
      </p>
    </div>
  );
}

function NotesTile() {
  return (
    <div
      className={cn(
        CARD_TILE,
        SLIDE,
        "flex flex-[1_1_280px] flex-col gap-3 p-6 sm:min-h-80 sm:p-8",
      )}
    >
      <TileTitle replaces="Google Drive">Files and notes</TileTitle>
      <AvatarStack names={["Ava Brooks", "Maya Patel", "Jay Kim"]} className="mt-2" />
      <div
        className={cn(TILE_HEADLINE, "mt-auto pt-4 text-[clamp(34px,3.6vw,48px)] leading-[0.98]")}
      >
        Edit together, live.
      </div>
      <p className="text-muted-foreground text-[15px] leading-[1.55] text-pretty">
        Meeting notes, templates, uploads and club storage that stay put when officers graduate.
      </p>
    </div>
  );
}

function DatabasesTile() {
  return (
    <div
      className={cn(
        SLIDE,
        "bg-muted rounded-card flex flex-[1.5_1_400px] flex-col gap-3.5 p-6 sm:p-8",
      )}
    >
      <TileTitle onMuted replaces="Airtable and spreadsheets">
        Databases
      </TileTitle>
      <h3
        className={cn(TILE_HEADLINE, "max-w-[460px] text-[clamp(26px,2.4vw,32px)] leading-[1.1]")}
      >
        Attendance, sign-ups and ballots, connected to the data you already have.
      </h3>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        {DATA_SOURCES.map((source) => (
          <span
            key={source}
            className="bg-card inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold whitespace-nowrap"
          >
            {source}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-[15px] leading-[1.55]">
        Connect a source once and every member sees the same live list.
      </p>
    </div>
  );
}

/** The club's theme, and what each member pins for themselves. */
function CustomizationTile() {
  return (
    <div className={cn(CARD_TILE, SPLIT_TILE, SLIDE, "flex-[2_1_520px]")}>
      <div className="flex flex-col gap-3.5">
        <TileTitle>Customization</TileTitle>
        <h3 className={cn(TILE_HEADLINE, "text-[clamp(30px,3.2vw,42px)] leading-[1.05]")}>
          Make it look like your club.
        </h3>
        <p className="text-muted-foreground text-[16px] leading-[1.55] text-pretty">
          The club sets its colors, theme and pinned spaces for everyone. Each member then
          rearranges their own board, pins and views, so every person sees what&apos;s useful to
          them.
        </p>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="bg-muted rounded-tile flex flex-col gap-2.5 p-4">
          <span className="text-muted-foreground text-[13px] font-medium">Club theme</span>
          <div className="flex gap-2.5">
            {THEME_SWATCHES.map((swatch, i) => (
              <span
                key={swatch.name}
                title={swatch.name}
                className={cn(
                  "ring-foreground/10 grid size-9 place-items-center rounded-full ring-1",
                  swatch.base,
                  i === 0 && "outline-foreground outline-2 outline-offset-2",
                )}
              >
                <span className={cn("size-3 rounded-full", swatch.dot)} />
              </span>
            ))}
          </div>
        </div>
        <div className="bg-muted rounded-tile flex flex-col gap-2.5 p-4 max-sm:hidden">
          <span className="text-muted-foreground text-[13px] font-medium">Pinned for you</span>
          <div className="flex flex-wrap gap-1.5">
            {PINNED.map((pin) => (
              <span
                key={pin}
                className="bg-card inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap"
              >
                <Pin className="text-muted-foreground size-3.5" />
                {pin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** People, with a mini org chart: the president over two teams, on the goal block. */
function PeopleTile() {
  return (
    <div
      className={cn(
        BLOCK_TILE.goal,
        SLIDE,
        "flex flex-[1_1_260px] flex-col gap-3 p-6 sm:min-h-80 sm:p-8",
      )}
    >
      <TileTitle onBlock>People</TileTitle>
      <div aria-hidden="true" className="mt-5 flex flex-col items-center">
        <span className="bg-block-goal-foreground text-block-goal rounded-full px-3 py-1.5 text-[13px] font-semibold">
          President
        </span>
        <span className="h-3.5 w-px bg-current/35" />
        {/* One column per team. Each draws half the crossbar, from its own
            centre toward the middle, so the bar always ends exactly over
            each team's line, however wide the names are. */}
        <div className="grid w-full max-w-[240px] grid-cols-2">
          {TEAMS.map((team, i) => (
            <span key={team} className="relative flex flex-col items-center pt-3">
              <span
                className={cn(
                  "absolute top-0 h-px bg-current/35",
                  i === 0 ? "right-0 left-1/2" : "right-1/2 left-0",
                )}
              />
              <span className="absolute top-0 left-1/2 h-3 w-px bg-current/35" />
              <span
                className={cn(
                  ON_BLOCK_CHIP,
                  "rounded-full px-2.5 py-[5px] text-[12px] font-semibold whitespace-nowrap",
                )}
              >
                {team}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div
        className={cn(TILE_HEADLINE, "mt-auto pt-4 text-[clamp(32px,3.2vw,44px)] leading-[1.02]")}
      >
        Hand over in one click.
      </div>
      <p className="text-[15px] leading-[1.55] text-pretty text-(--meta)">
        Roles, profiles and saved org chart versions, so next year’s board starts with everything.
      </p>
    </div>
  );
}
