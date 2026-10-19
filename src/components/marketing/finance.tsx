import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Gauge, TickMeter } from "@/components/ui/meters";
import { cn } from "@/lib/utils";

/** The budget lines, one tick per $125 (sample figures, like the rest of the mock). */
const LINES = [
  { name: "Events", spent: "$1,860", ticks: 15, of: 18, color: "var(--chart-1)" },
  { name: "Food", spent: "$940", ticks: 8, of: 10, color: "var(--chart-2)" },
  { name: "Printing", spent: "$310", ticks: 2, of: 4, color: "var(--chart-3)" },
] as const;

const FEATURES = [
  { title: "Budgets and transactions", body: "Plan by term, log spending as it happens." },
  { title: "Reimbursements", body: "Receipts attached, approvals tracked." },
  { title: "Sponsorships", body: "Keep commitments and payments in one list." },
  { title: "Runway", body: "See how far current funds will carry you." },
] as const;

/** The small cards under the budget block. */
const WIDGET = "bg-background rounded-block flex min-w-0 flex-[1_1_240px] flex-col gap-3.5 p-5";

/**
 * Finance (redesign guide 10.5): a shell-sized card lit by the glow from
 * its corner, the pitch beside the treasurer's board (a goal block with the
 * budget gauge, a tick meter per budget line, a reimbursement), then four
 * feature columns. Phones skip the budget lines and put the features two
 * to a row.
 */
export function Finance() {
  return (
    <section id="finance" className="px-[clamp(8px,1.5vw,20px)]">
      <div className="bg-card text-card-foreground edge ring-foreground/6 glow-corner rounded-shell relative overflow-hidden ring-1">
        <div className="relative mx-auto flex max-w-[1240px] flex-col gap-[clamp(40px,6vw,72px)] px-5 py-[clamp(48px,8vw,104px)] sm:px-8">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-10 sm:gap-14">
            <div className="flex flex-col gap-5 sm:gap-6">
              <span className="text-muted-foreground text-[15px] font-medium">Finance</span>
              <h2 className="display-title text-[clamp(36px,4.6vw,58px)] leading-[1.02] tracking-[-0.04em]">
                Know where every dollar went,{" "}
                <span className="text-muted-foreground">and how long the rest will last.</span>
              </h2>
              <p className="text-muted-foreground max-w-[500px] text-[16px] leading-[1.6] text-pretty sm:text-[18px]">
                Treasurers get a widget board with charts they can arrange themselves. Members
                submit reimbursements with a photo of the receipt.
              </p>
            </div>

            <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
              <div className="bg-block-goal text-block-goal-foreground rounded-block relative flex items-center justify-between gap-4 overflow-hidden p-5 sm:p-6">
                <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/7 to-transparent to-45%" />
                <div className="relative flex min-w-0 flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-(--block-goal-meta)">
                    Fall budget
                  </span>
                  <span className="numeral text-[clamp(38px,4vw,48px)]">$1,240</span>
                  <span className="text-[14px] text-(--block-goal-meta)">
                    left this term, about 9 weeks of runway
                  </span>
                </div>
                <Gauge value={62} caption="spent" size={118} className="relative" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className={cn(WIDGET, "max-sm:hidden")}>
                  <span className="heading text-[15px]">Budget lines</span>
                  {LINES.map((line) => (
                    <div key={line.name} className="flex flex-col gap-1.5">
                      <span className="flex justify-between text-[13px]">
                        <span>{line.name}</span>
                        <span className="font-semibold tabular-nums">{line.spent}</span>
                      </span>
                      <TickMeter
                        total={line.of}
                        filled={line.ticks}
                        color={line.color}
                        height={14}
                        label={`${line.name}: ${line.spent} spent`}
                      />
                    </div>
                  ))}
                </div>
                <div className={WIDGET}>
                  <span className="heading text-[15px]">Reimbursement</span>
                  <div className="flex items-center gap-3">
                    <span className="bg-receipt ring-foreground/8 h-12 w-10 flex-none rounded-lg ring-1" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">Pizza for GBM</span>
                      <span className="text-muted-foreground text-[13px]">Jay · $86.40</span>
                    </span>
                  </div>
                  <Badge variant="success" className="mt-auto">
                    <Check />
                    Approved by the treasurer
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-x-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-1.5">
                <span className="text-[15px] leading-[1.3] font-semibold sm:text-[16px]">
                  {feature.title}
                </span>
                <span className="text-muted-foreground text-[14px] leading-[1.5] sm:text-[15px]">
                  {feature.body}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
