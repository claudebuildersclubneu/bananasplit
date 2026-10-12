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

/** "Every club ripens at its own pace.": five columns, one per stage. */
export function Ripeness() {
  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-14 px-6 pt-16 pb-32">
      <SectionIntro title="Every club ripens at its own pace." className="max-w-[360px]">
        Bananasplit fits a three-person startup club and a 200-member society alike.
      </SectionIntro>
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-6 gap-y-8">
        {STAGES.map((stage, i) => (
          <div key={stage.title} className="border-ink/14 flex flex-col gap-3.5 border-t pt-6">
            <span className={cn("h-3.5 w-10 rounded-full", stage.swatch)} />
            <span className="font-code text-ink-faint text-[12px]">Stage {i + 1}</span>
            <span className="text-[18px] font-bold">{stage.title}</span>
            <span className="text-ink-muted text-[15px] leading-[1.5]">{stage.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
