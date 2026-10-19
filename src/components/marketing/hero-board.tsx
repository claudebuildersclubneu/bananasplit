import { ArrowUpRight, Bell, Check, Flag, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BlockCard } from "@/components/ui/block-card";
import { TagChip } from "@/components/ui/chip";
import { Gauge, MixBar } from "@/components/ui/meters";
import { cn } from "@/lib/utils";

import { AvatarStack } from "./avatar-stack";

/** A sample club's week (the same club as the rest of the page). */
const TASKS = [
  {
    title: "Send the GBM agenda to members",
    tag: { label: "Club operations", color: "var(--chart-2)" },
    due: "Today",
    tone: "today",
    priority: "urgent",
  },
  {
    title: "Confirm the venue for the Fall Showcase",
    tag: { label: "Fall Showcase", color: "var(--chart-3)" },
    due: "Tomorrow",
    tone: "tomorrow",
    priority: "high",
  },
  {
    title: "Review Jay's spring budget draft",
    tag: { label: "Treasury", color: "var(--chart-5)" },
    due: "Wed, Oct 14",
    tone: "later",
  },
  {
    title: "Book Engineering Hall 112",
    tag: { label: "Fall Showcase", color: "var(--chart-3)" },
    due: "Fri, Oct 9",
    tone: "later",
    done: true,
  },
] as const;

const DUE_TONE = {
  today: "text-tint-danger-foreground font-semibold",
  tomorrow: "text-foreground font-semibold",
  later: "text-muted-foreground",
} as const;

/** An outline circle button, as in a card header (decoration here). */
function CircleIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-input grid size-8 place-items-center rounded-full border [&_svg]:size-4">
      {children}
    </span>
  );
}

/**
 * The hero's product picture: a club's Overview (redesign guide 9) built
 * from the app's own pieces (block cards, a card, chips, the gauge), framed
 * like a window and fading out at the bottom. One picture for screen
 * readers; on phones it keeps two blocks and the task list.
 */
export function HeroBoard() {
  return (
    <div className="mx-auto mt-12 w-full max-w-[1260px] px-4 sm:mt-16 sm:px-6 lg:px-10">
      <div
        role="img"
        aria-label="A club's Overview in Bananasplit: a poll waiting on your vote, the GBM agenda due today, RSVPs for the Fall Showcase, Thursday's general meeting, your tasks and the fall budget."
        className="rounded-shell bg-card/50 ring-foreground/8 shadow-e2 [mask-image:linear-gradient(to_bottom,black_72%,transparent)] p-2 ring-1 sm:p-2.5"
      >
        <div className="bg-background glow-corner relative flex flex-col gap-5 overflow-hidden rounded-[calc(var(--radius-shell)-0.625rem)] p-4 text-left sm:gap-6 sm:p-7">
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="font-heading text-[clamp(26px,3vw,38px)] leading-[1.02] font-[640] tracking-[-0.035em]">
                Good afternoon, Maya
              </span>
              <span className="text-muted-foreground text-[14px]">
                Monday, October 12 · Riverside Robotics
              </span>
            </div>
            <div className="glass-light hidden h-11 flex-none items-center gap-1 rounded-full py-1 pr-1 pl-4 md:flex">
              <Search className="text-muted-foreground size-[18px]" />
              <span className="text-muted-foreground w-40 text-[14px]">Search</span>
              <kbd className="bg-muted text-muted-foreground rounded-md px-1.5 py-1 text-[11px] leading-none">
                ⌘K
              </kbd>
              <span className="ml-1 grid size-9 place-items-center rounded-full">
                <Bell className="size-[18px]" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4.5 lg:grid-cols-4">
            <BlockCard
              tone="answer"
              kicker="Your vote"
              title="Spring retreat weekend"
              subtitle="Closes Friday"
              figure="8 of 14"
              figureLabel="voted"
              aside={
                <AvatarStack
                  names={["Maya Patel", "Jay Kim", "Sara Ruiz"]}
                  more={5}
                  ring="ring-(--ring-bg)"
                  className="max-sm:hidden"
                />
              }
              className="min-h-[200px] max-sm:p-4"
            />
            <BlockCard
              tone="alert"
              kicker="Due today"
              title="Send the GBM agenda"
              subtitle="Club operations"
              aside={<AvatarStack names={["Jordan Lee"]} ring="ring-(--ring-bg)" />}
              className="min-h-[200px] max-sm:p-4"
            />
            <BlockCard
              tone="goal"
              kicker="RSVPs"
              title="Fall Showcase"
              subtitle="Sat, Oct 24"
              figure="34 of 50"
              figureLabel="going"
              className="min-h-[200px] max-sm:hidden"
            />
            <BlockCard
              tone="quiet"
              kicker="Thu · 6:00 PM"
              title="General meeting"
              subtitle="Student Union 204"
              aside={
                <AvatarStack
                  names={["Ava Brooks", "Tom Baker", "Mia Chen"]}
                  more={21}
                  ring="ring-(--ring-bg)"
                />
              }
              className="min-h-[200px] max-sm:hidden"
            />
          </div>

          <div className="grid gap-3 sm:gap-4.5 lg:grid-cols-[1.45fr_1fr]">
            <div className="bg-card edge ring-foreground/6 rounded-card min-w-0 p-5 ring-1 sm:p-6">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="heading text-[17px]">My tasks</span>
                <Badge variant="secondary">6</Badge>
                <span className="flex-1" />
                <CircleIcon>
                  <ArrowUpRight />
                </CircleIcon>
              </div>
              <ul className="m-0 list-none p-0">
                {TASKS.map((task, i) => (
                  <li key={task.title} className={cn("flex gap-3", i === 3 && "max-sm:hidden")}>
                    <span
                      className={cn(
                        "mt-3.5 grid size-[22px] flex-none place-items-center rounded-full",
                        "done" in task
                          ? "bg-block-goal text-block-goal-foreground"
                          : "border-input border-[1.5px]",
                      )}
                    >
                      {"done" in task && <Check className="size-3.5" strokeWidth={2.5} />}
                    </span>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 py-3",
                        i > 0 && "border-border border-t",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span
                          className={cn(
                            "truncate text-[15px] leading-[1.35]",
                            "done" in task && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-[13px]">
                          <TagChip color={task.tag.color}>{task.tag.label}</TagChip>
                          <span className={DUE_TONE[task.tone]}>{task.due}</span>
                        </span>
                      </div>
                      {"priority" in task && task.priority === "urgent" && (
                        <Badge variant="destructive" className="max-sm:hidden">
                          <Flag />
                          Urgent
                        </Badge>
                      )}
                      {"priority" in task && task.priority === "high" && (
                        <Badge variant="accent" className="max-sm:hidden">
                          High
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card edge ring-foreground/6 rounded-card hidden min-w-0 flex-col p-6 ring-1 lg:flex">
              <div className="flex items-center gap-2.5">
                <span className="heading text-[17px]">Fall budget</span>
                <span className="flex-1" />
                <CircleIcon>
                  <ArrowUpRight />
                </CircleIcon>
              </div>
              <MixBar
                label="Spent so far: events $1,860, food $940, printing $310; $1,240 not spent yet"
                height={14}
                className="mt-5"
                segments={[
                  { label: "Events", value: 1860, color: "var(--chart-1)" },
                  { label: "Food", value: 940, color: "var(--chart-2)" },
                  { label: "Printing", value: 310, color: "var(--chart-3)" },
                  { label: "Left", value: 1240, hatch: true },
                ]}
                legend={false}
              />
              <span className="text-muted-foreground mt-3 flex gap-4 text-[13px]">
                {(
                  [
                    ["Events", "var(--chart-1)"],
                    ["Food", "var(--chart-2)"],
                    ["Printing", "var(--chart-3)"],
                  ] as const
                ).map(([name, color]) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
                    {name}
                  </span>
                ))}
              </span>
              <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="numeral text-[44px]">$1,240</span>
                  <span className="text-muted-foreground text-[14px]">left this term</span>
                  <Badge variant="success" className="mt-2">
                    9 weeks of runway
                  </Badge>
                </div>
                <Gauge value={62} caption="spent" size={124} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
