import { cn } from "@/lib/utils";

import { CONTAINER, SectionIntro } from "./section-title";

/** A club's growth stages. */
const STAGES = [
  { title: "Founding", body: "Guided setup connects your data, tags, finance and teams." },
  { title: "Recruiting", body: "Share an invite code, send email invites and track sign-ups." },
  { title: "First event", body: "Run an availability poll, post the event and collect RSVPs." },
  {
    title: "Running smoothly",
    body: "Weekly updates, attendance and reimbursements without spreadsheets.",
  },
  {
    title: "Handing over",
    body: "Org chart versions, shared notes and a full export for next year's board.",
  },
] as const;

/**
 * "Every club ripens at its own pace.": five columns, one per stage, each
 * with a five-tick meter that fills with the glow as the club ripens. On
 * phones each stage is a short row, its meter beside the words.
 */
export function Ripeness() {
  return (
    <section
      className={cn(CONTAINER, "flex flex-col gap-8 pt-4 pb-20 sm:gap-14 sm:pt-16 sm:pb-32")}
    >
      <SectionIntro title="Every club ripens at its own pace." className="max-w-[360px]">
        Bananasplit fits a three-person startup club and a 200-member society alike.
      </SectionIntro>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-8 gap-y-6 p-0 sm:gap-y-10">
        {STAGES.map((stage, i) => (
          <li
            key={stage.title}
            className="grid grid-cols-[56px_1fr] items-start gap-x-4 gap-y-1 sm:flex sm:flex-col sm:gap-3"
          >
            <span aria-hidden="true" className="row-span-3 mt-1.5 flex gap-1 sm:mt-0 sm:mb-1">
              {[0, 1, 2, 3, 4].map((tick) => (
                <i
                  key={tick}
                  className={cn(
                    "h-2 w-2 rounded-full sm:h-2.5 sm:w-5",
                    tick <= i
                      ? "bg-glow shadow-[0_0_10px_color-mix(in_oklab,var(--glow)_50%,transparent)]"
                      : "bg-muted-strong",
                  )}
                />
              ))}
            </span>
            <span className="text-muted-foreground hidden text-[13px] font-medium sm:block">
              Stage {i + 1}
            </span>
            <span className="text-[17px] font-semibold sm:text-[18px]">{stage.title}</span>
            <span className="text-muted-foreground text-[14px] leading-[1.5] sm:text-[15px]">
              {stage.body}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
