import { cn } from "@/lib/utils";

/** Spending per month in the balance widget (sample figures, like the rest of the mock). */
const MONTHS = [
  { month: "Sep", height: "h-[82%]", tone: "bg-straw" },
  { month: "Oct", height: "h-[64%]", tone: "bg-straw" },
  { month: "Nov", height: "h-[90%]", tone: "bg-straw" },
  { month: "Dec", height: "h-[38%]", tone: "bg-straw" },
  { month: "Jan", height: "h-[56%]", tone: "bg-banana" },
  { month: "Feb", height: "h-[44%]", tone: "bg-butter" },
] as const;

const CATEGORIES = [
  { name: "Events", amount: "$1,860", dot: "bg-banana" },
  { name: "Food", amount: "$940", dot: "bg-ripe" },
  { name: "Printing", amount: "$310", dot: "bg-spot" },
  { name: "Other", amount: "$150", dot: "bg-dusk" },
] as const;

const FEATURES = [
  { title: "Budgets and transactions", body: "Plan by term, log spending as it happens." },
  { title: "Reimbursements", body: "Receipts attached, approvals tracked." },
  { title: "Sponsorships", body: "Keep commitments and payments in one list." },
  { title: "Runway", body: "See how far current funds will carry you." },
] as const;

/** The small white widgets under the balance. */
const WIDGET = "flex flex-[1_1_220px] flex-col gap-3 rounded-[22px] bg-paper p-5";

/**
 * The dark panel, inset from the page edges and lit by two banana glows:
 * the pitch beside a mock of the treasurer's widget board, then four
 * feature columns.
 */
export function Finance() {
  return (
    <section id="finance" className="px-[clamp(8px,1.5vw,20px)]">
      <div className="bg-night text-cream relative overflow-hidden rounded-[clamp(24px,3vw,40px)]">
        <div aria-hidden="true">
          <span className="bg-glow-banana-22 absolute -top-[200px] -right-[160px] size-[620px] rounded-full" />
          <span className="bg-glow-banana-10 absolute -bottom-[240px] -left-[160px] size-[520px] rounded-full" />
        </div>
        <div className="relative mx-auto flex max-w-[1240px] flex-col gap-[clamp(48px,6vw,72px)] px-6 py-[clamp(72px,9vw,120px)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14">
            <div className="flex flex-col gap-6">
              <span className="bg-banana text-ink self-start rounded-full px-3 py-[5px] text-[13px] font-bold">
                Finance
              </span>
              <h2 className="font-heading text-[clamp(38px,4.8vw,62px)] leading-[1.02] tracking-[-0.035em] text-balance">
                Know where every dollar went,{" "}
                <span className="text-banana">and how long the rest will last.</span>
              </h2>
              <p className="text-dusk max-w-[500px] text-[18px] leading-[1.6] text-pretty">
                Treasurers get a widget board with charts they can arrange themselves. Members
                submit reimbursements with a photo of the receipt.
              </p>
            </div>

            <div className="text-ink relative flex flex-col gap-3">
              <div className="bg-paper shadow-widget flex flex-col gap-[18px] rounded-[22px] p-[22px]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-ink-soft text-[13px]">Left this term</span>
                    <span className="font-heading text-[44px] leading-none tracking-[-0.03em] tabular-nums">
                      $1,240
                    </span>
                  </div>
                  <span className="bg-leaf text-leaf-ink rounded-full px-2.5 py-[5px] text-[12px] font-bold whitespace-nowrap">
                    9 weeks of runway
                  </span>
                </div>
                <div className="flex h-[110px] items-stretch gap-2.5">
                  {MONTHS.map((bar) => (
                    <div
                      key={bar.month}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className={cn("w-full max-w-7 rounded-md", bar.height, bar.tone)} />
                      <span className="text-ink-faint text-[11px]">{bar.month}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className={WIDGET}>
                  <span className="text-ink-soft text-[13px]">Spent by category</span>
                  {CATEGORIES.map((category) => (
                    <div key={category.name} className="flex items-center gap-2.5 text-[13px]">
                      <span className={cn("size-2 rounded-full", category.dot)} />
                      <span className="flex-1">{category.name}</span>
                      <span className="font-semibold tabular-nums">{category.amount}</span>
                    </div>
                  ))}
                </div>
                <div className={WIDGET}>
                  <span className="text-ink-soft text-[13px]">Reimbursement</span>
                  <div className="flex items-center gap-3">
                    <span className="border-ink/10 bg-receipt h-12 w-10 rounded-lg border" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold">Pizza for GBM</span>
                      <span className="text-ink-soft text-[13px]">Jay · $86.40</span>
                    </span>
                  </div>
                  <span className="bg-leaf text-leaf-ink self-start rounded-full px-2.5 py-[5px] text-[12px] font-bold">
                    ✓ Approved by treasurer
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-8 gap-y-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border-cream/16 flex flex-col gap-1.5 border-t pt-4"
              >
                <span className="text-[16px] font-bold">{feature.title}</span>
                <span className="text-ink-ghost text-[15px] leading-[1.5]">{feature.body}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
