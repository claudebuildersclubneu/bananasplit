import { ArrowRight } from "@/components/brand/arrows";
import { CoreMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

import { type Avatar, AvatarStack } from "./avatar-stack";
import { Screenshot } from "./screenshot";
import { SectionIntro } from "./section-title";

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

const TASK_VIEWS = ["Week", "Board", "Table", "Calendar", "Team"] as const;

const CHAT_RESULTS = [
  "Event added: Spring Showcase, Apr 12",
  "Task: Book venue → Maya",
  "Task: Snacks → Jay",
] as const;

const RSVPS: readonly Avatar[] = [
  { tone: "bg-banana" },
  { tone: "bg-wheat" },
  { tone: "bg-spot" },
  { tone: "bg-ink" },
];

const EDITORS: readonly Avatar[] = [
  { tone: "bg-banana", initial: "A" },
  { tone: "bg-wheat", initial: "M" },
  { tone: "bg-ink text-cream", initial: "J" },
];

/**
 * What a database can be fed from today: a live sync from a Supabase
 * database (the only connector; other Postgres hosts are refused), or a CSV.
 */
const DATA_SOURCES = ["Supabase", "CSV import", "Google Sheets via CSV", "Excel via CSV"] as const;

/** The club theme picker: the first swatch is the one chosen. */
const THEME_SWATCHES = ["bg-banana", "bg-pine", "bg-brick", "bg-navy", "bg-ink"] as const;

const PINNED = ["Budget", "Showcase tasks", "Meeting notes"] as const;

const TEAMS = ["Events", "Treasury"] as const;

/** The white tiles: paper, a hairline and the soft card shadow. */
const PAPER_TILE = "rounded-[28px] border border-ink/8 bg-paper shadow-card";

/** The two-column tiles: copy beside a sample, stacked once two 260px columns don't fit. */
const SPLIT_TILE =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-center gap-7 p-[clamp(28px,3vw,40px)]";

/** Each tile surface's label colour. */
const LABEL_TONES = {
  paper: "text-ink-faint",
  sand: "text-ink-soft",
  banana: "text-honey-deep",
  butter: "text-honey",
  ink: "text-banana",
} as const;

/**
 * A tile's small label, with the app it replaces as a tag on the right of
 * the row (wrapping below it when the tile is narrow).
 */
function TileTitle({
  children,
  replaces,
  tone = "paper",
}: {
  children: React.ReactNode;
  replaces?: string;
  tone?: keyof typeof LABEL_TONES;
}) {
  const label = (
    <span
      className={cn(
        "relative inline-flex items-center gap-2 text-[15px] font-bold tracking-[-0.005em]",
        LABEL_TONES[tone],
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
          "rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
          tone === "banana" ? "bg-paper/60 text-honey-dark" : "bg-ink/5 text-ink-soft",
        )}
      >
        Replaces {replaces}
      </span>
    </div>
  );
}

/** "Every scoop your club needs.": the apps it replaces, then a bento of features. */
export function FeatureBoard() {
  return (
    <section id="features" className="mx-auto flex max-w-[1240px] flex-col gap-14 px-6 pt-32 pb-28">
      <SectionIntro title="Every scoop your club needs." className="max-w-[380px] text-pretty">
        Most clubs juggle seven apps, each with its own login and member list. Bananasplit puts
        events, money and data in one workspace with one member list and one bill.
      </SectionIntro>

      <div className="-mt-6 flex flex-wrap items-center gap-2">
        {REPLACED_APPS.map((app) => (
          <span
            key={app}
            className="bg-sand text-ink-faint rounded-full px-3 py-1.5 text-[14px] line-through"
          >
            {app}
          </span>
        ))}
        <span className="text-core flex px-1">
          <ArrowRight />
        </span>
        <span className="bg-ink text-cream inline-flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2 text-[14px] font-bold">
          <CoreMark size={18} />
          One workspace
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <OverviewTile />
          <div className="flex flex-[1_1_300px] flex-col gap-4">
            <TasksTile />
            <CalendarTile />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <EventsTile />
          <AiTile />
        </div>
        <div className="flex flex-wrap gap-4">
          <NotesTile />
          <DatabasesTile />
        </div>
        <div className="flex flex-wrap gap-4">
          <CustomizationTile />
          <PeopleTile />
        </div>
      </div>
    </section>
  );
}

/** The wide tile; its screenshot bleeds off the bottom-right corner. */
function OverviewTile() {
  return (
    <div
      className={cn(
        PAPER_TILE,
        "flex flex-[2_1_520px] flex-col gap-4 overflow-hidden p-[clamp(28px,3vw,40px)]",
      )}
    >
      <TileTitle>Overview</TileTitle>
      <h3 className="font-heading max-w-[520px] text-[clamp(30px,3.4vw,46px)] leading-[1.05] tracking-[-0.025em] text-balance">
        Everyone opens to what matters to them.
      </h3>
      <p className="text-ink-muted max-w-[460px] text-[16px] leading-[1.55] text-pretty">
        Each member arranges a home board of widgets: tasks due this week, the next meeting, pinned
        notes, files and people.
      </p>
      <Screenshot
        label="screenshot: Overview widgets"
        chip="md"
        className="border-ink/10 mt-auto -mr-[clamp(28px,3vw,40px)] -mb-[clamp(28px,3vw,40px)] ml-[clamp(28px,3vw,40px)] aspect-[16/8] rounded-tl-[14px] border-t border-l"
      />
    </div>
  );
}

function TasksTile() {
  return (
    <div className="bg-banana relative flex flex-[1_0_auto] flex-col gap-2 overflow-hidden rounded-[28px] p-8">
      <span
        aria-hidden="true"
        className="bg-glow-cream absolute -top-10 -right-10 size-[180px] rounded-full"
      />
      <TileTitle tone="banana" replaces="Trello">
        Tasks
      </TileTitle>
      <h3 className="relative mt-auto flex items-end gap-3.5">
        <span className="font-heading text-[clamp(96px,9vw,128px)] leading-[0.78] tracking-[-0.05em]">
          5
        </span>
        <span className="pb-0.5 text-[19px] leading-[1.25] font-semibold">
          ways to see
          <br />
          the same work
        </span>
      </h3>
      <p className="text-bark relative mt-2.5 text-[15px] leading-[1.5]">
        Assign it once and nothing slips between meetings.
      </p>
      <div className="relative mt-[18px] flex flex-wrap gap-1.5">
        {TASK_VIEWS.map((view) => (
          <span
            key={view}
            className="bg-paper/60 rounded-full px-[11px] py-[5px] text-[13px] font-semibold"
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
    <div className={cn(PAPER_TILE, "flex flex-[1_0_auto] flex-col gap-2.5 p-8")}>
      <TileTitle replaces="When2meet">Calendar</TileTitle>
      <h3 className="font-heading mt-auto text-[clamp(28px,2.6vw,36px)] leading-[1.05] tracking-[-0.025em]">
        Find a time, then put it on everyone&apos;s calendar.
      </h3>
      <p className="text-ink-muted text-[15px] leading-[1.55] text-pretty">
        Availability polls pick the time, and every meeting shows up in your club&apos;s Google
        Calendar.
      </p>
    </div>
  );
}

/** RSVPs and events, with a sample event card. */
function EventsTile() {
  return (
    <div className={cn(PAPER_TILE, SPLIT_TILE, "flex-[1.6_1_460px]")}>
      <div className="flex flex-col gap-3.5">
        <TileTitle replaces="Luma">RSVPs and events</TileTitle>
        <h3 className="font-heading text-[clamp(32px,3.4vw,46px)] leading-[1.04] tracking-[-0.025em] text-balance">
          You don&apos;t need Luma anymore.
        </h3>
        <p className="text-ink-muted text-[16px] leading-[1.55] text-pretty">
          Public event pages with RSVPs, waitlists, reminders and QR check-in. Every guest lands in
          your member list, so you can see who keeps coming back.
        </p>
      </div>
      <div className="border-ink/8 bg-cream flex flex-col gap-3.5 rounded-[20px] border p-[18px]">
        <div className="bg-event-cover flex h-24 items-end rounded-xl p-3">
          <span className="bg-paper/85 rounded-md px-2 py-[3px] font-mono text-[11px] font-medium">
            FRI · 7:00 PM
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-bold">Spring Showcase</span>
          <span className="text-ink-soft text-[13px]">Student Union, Room 204</span>
        </div>
        <div className="flex items-center gap-2.5">
          <AvatarStack avatars={RSVPS} itemClassName="border-cream size-6" overlap="-ml-2" />
          <span className="text-[13px] font-semibold">86 going</span>
          <span className="text-ink-soft text-[13px]">· 12 on waitlist</span>
        </div>
        <span className="bg-ink text-cream rounded-full p-[11px] text-center text-[14px] font-semibold">
          RSVP
        </span>
      </div>
    </div>
  );
}

/** The dark tile: a typed request turned into an event and tasks. */
function AiTile() {
  return (
    <div className="bg-ink text-cream relative flex flex-[1_1_320px] flex-col gap-3.5 overflow-hidden rounded-[28px] p-8">
      <span
        aria-hidden="true"
        className="bg-glow-banana absolute -top-20 -right-20 size-[280px] rounded-full"
      />
      <TileTitle tone="ink">AI built in</TileTitle>
      <h3 className="font-heading relative text-[clamp(30px,3vw,40px)] leading-[1.05] tracking-[-0.025em] text-balance">
        Type it. It&apos;s sorted.
      </h3>
      <div className="relative my-1.5 flex flex-col gap-2">
        <span className="bg-banana text-ink max-w-[90%] self-end rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[14px] leading-[1.45]">
          Showcase is April 12. Maya books the venue, Jay does snacks.
        </span>
        <div className="border-cream/10 bg-cream/8 flex w-[90%] flex-col gap-1.5 self-start rounded-[16px_16px_16px_4px] border p-3">
          {CHAT_RESULTS.map((result) => (
            <span key={result} className="flex items-center gap-2 text-[13px]">
              <span className="text-banana">✓</span>
              {result}
            </span>
          ))}
        </div>
      </div>
      <p className="text-dusk relative mt-auto text-[15px] leading-[1.55] text-pretty">
        Create tasks and calendar events just by typing. AI also sorts your task lists, tidies
        databases and lays out the org chart. Connect the model you prefer with your own API key.
      </p>
    </div>
  );
}

function NotesTile() {
  return (
    <div className={cn(PAPER_TILE, "flex min-h-80 flex-[1_1_280px] flex-col gap-3 p-8")}>
      <TileTitle replaces="Google Drive">Notes and storage</TileTitle>
      <AvatarStack
        avatars={EDITORS}
        itemClassName="border-paper grid size-[34px] place-items-center text-[13px] font-bold"
        overlap="-ml-2.5"
        className="mt-2"
      />
      <h3 className="font-heading mt-auto text-[clamp(36px,3.8vw,50px)] leading-[0.98] tracking-[-0.03em]">
        Edit together, live.
      </h3>
      <p className="text-ink-muted text-[15px] leading-[1.55] text-pretty">
        Meeting notes, templates, files and club storage that stay put when officers graduate.
      </p>
    </div>
  );
}

function DatabasesTile() {
  return (
    <div className="bg-sand flex flex-[1.5_1_400px] flex-col gap-3.5 rounded-[28px] p-8">
      <TileTitle tone="sand" replaces="Airtable and spreadsheets">
        Databases
      </TileTitle>
      <h3 className="font-heading max-w-[460px] text-[clamp(26px,2.4vw,32px)] leading-[1.1] tracking-[-0.025em] text-balance">
        Attendance, sign-ups and ballots, connected to the data you already have.
      </h3>
      <div className="mt-auto flex flex-wrap gap-2">
        {DATA_SOURCES.map((source) => (
          <span
            key={source}
            className="bg-paper rounded-full px-3 py-[7px] text-[13px] font-semibold whitespace-nowrap"
          >
            {source}
          </span>
        ))}
      </div>
      <p className="text-ink-muted text-[15px] leading-[1.55]">
        Connect your Supabase database once and every member sees the same live list, or import a
        CSV from Sheets or Excel.
      </p>
    </div>
  );
}

/** The club's theme, and what each member pins for themselves. */
function CustomizationTile() {
  return (
    <div className={cn(PAPER_TILE, SPLIT_TILE, "flex-[2_1_520px]")}>
      <div className="flex flex-col gap-3.5">
        <TileTitle>Customization</TileTitle>
        <h3 className="font-heading text-[clamp(30px,3.2vw,44px)] leading-[1.05] tracking-[-0.025em] text-balance">
          Make it look like your club.
        </h3>
        <p className="text-ink-muted text-[16px] leading-[1.55] text-pretty">
          The club sets its colors, theme and pinned spaces for everyone. Each member then
          rearranges their own board, pins and views, so every person sees what&apos;s useful to
          them.
        </p>
      </div>
      <div className="flex flex-col gap-3.5">
        <div className="bg-cream flex flex-col gap-2 rounded-[18px] p-4">
          <span className="text-ink-soft text-[12px] font-bold">Club theme</span>
          <div className="flex gap-2">
            {THEME_SWATCHES.map((swatch, i) => (
              <span
                key={swatch}
                className={cn("size-9 rounded-full", swatch, i === 0 && "shadow-ring-ink")}
              />
            ))}
          </div>
        </div>
        <div className="bg-cream flex flex-col gap-2 rounded-[18px] p-4">
          <span className="text-ink-soft text-[12px] font-bold">Pinned for you</span>
          <div className="flex flex-wrap gap-1.5">
            {PINNED.map((pin) => (
              <span
                key={pin}
                className="bg-paper rounded-full px-[11px] py-1.5 text-[13px] font-semibold whitespace-nowrap"
              >
                {pin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** People, with a mini org chart: the president over two teams. */
function PeopleTile() {
  return (
    <div className="bg-butter flex min-h-80 flex-[1_1_260px] flex-col gap-3 rounded-[28px] p-8">
      <TileTitle tone="butter">People</TileTitle>
      <div className="mt-5 flex flex-col items-center">
        <span className="bg-ink text-cream rounded-full px-3 py-1.5 text-[13px] font-bold">
          President
        </span>
        <span className="bg-ink/30 h-3.5 w-px" />
        <span className="bg-ink/30 h-px w-3/5" />
        <div className="flex w-[calc(60%+70px)] justify-between gap-1.5">
          {TEAMS.map((team) => (
            <span key={team} className="flex flex-col items-center">
              <span className="bg-ink/30 h-3 w-px" />
              <span className="bg-paper rounded-full px-2.5 py-[5px] text-[12px] font-semibold whitespace-nowrap">
                {team}
              </span>
            </span>
          ))}
        </div>
      </div>
      <h3 className="font-heading mt-auto text-[clamp(34px,3.4vw,46px)] leading-[1.02] tracking-[-0.03em]">
        Hand over in one click.
      </h3>
      <p className="text-bark-soft text-[15px] leading-[1.55] text-pretty">
        Roles, profiles and saved org chart versions, so next year’s board starts with everything.
      </p>
    </div>
  );
}
