import { cn } from "@/lib/utils";

import { SectionIntro } from "./section-title";

/** A club's growth stages, each with a banana from green to spotted. */
const STAGES = [
  {
    swatch: "bg-stage-1",
    title: "Founding",
    body: "Guided setup connects your data, labels, finance and teams.",
  },
  {
    swatch: "bg-stage-2",
    title: "Recruiting",
    body: "Share an invite code, send email invites and track sign-ups.",
  },
  {
    swatch: "bg-stage-3",
    title: "First event",
    body: "Run an availability poll, post the event and collect RSVPs.",
  },
  {
    swatch: "bg-stage-4",
    title: "Running smoothly",
    body: "Weekly updates, attendance and reimbursements without spreadsheets.",
  },
  {
    swatch: "bg-stage-5",
    title: "Handing over",
    body: "Org chart versions, shared notes and a full export for next year's board.",
  },
] as const;

/**
 * "Every club ripens at its own pace.": five columns, one per stage. On
 * phones each stage is a short row, its swatch beside the words.
 */
export function Ripeness() {
  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 pt-4 pb-20 sm:gap-14 sm:pt-16 sm:pb-32">
      <SectionIntro title="Every club ripens at its own pace." className="max-w-[360px]">
        Bananasplit fits a three-person startup club and a 200-member society alike.
      </SectionIntro>
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-6 gap-y-4 sm:gap-y-8">
        {STAGES.map((stage, i) => (
          <div
            key={stage.title}
            className="border-ink/14 grid grid-cols-[40px_1fr] items-start gap-x-4 gap-y-1 border-t pt-4 sm:flex sm:flex-col sm:gap-3.5 sm:pt-6"
          >
            <span
              className={cn("row-span-2 mt-1.5 h-3.5 w-10 rounded-full sm:mt-0", stage.swatch)}
            />
            <span className="text-ink-faint hidden font-mono text-[12px] sm:block">
              Stage {i + 1}
            </span>
            <span className="text-[17px] font-bold sm:text-[18px]">{stage.title}</span>
            <span className="text-ink-muted text-[14px] leading-[1.5] sm:text-[15px]">
              {stage.body}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
