import { cn } from "@/lib/utils";

/**
 * Spending per month in the balance widget (sample figures, like the rest of
 * the mock): what was paid, and on top, hatched, what is waiting to be paid
 * back.
 */
const MONTHS = [
  { month: "Sep", paid: "h-[70%]", pending: "h-[0%]" },
  { month: "Oct", paid: "h-[52%]", pending: "h-[0%]" },
  { month: "Nov", paid: "h-[78%]", pending: "h-[0%]" },
  { month: "Dec", paid: "h-[30%]", pending: "h-[0%]" },
  { month: "Jan", paid: "h-[44%]", pending: "h-[14%]" },
  { month: "Feb", paid: "h-[26%]", pending: "h-[22%]" },
] as const;

/** Budget lines, one tick per $200: spent of planned, drawn to scale. */
const BUDGET_LINES = [
  { name: "Events", spent: 9, planned: 12, amount: "$1,860 of $2,400" },
  { name: "Food", spent: 5, planned: 6, amount: "$940 of $1,200" },
  { name: "Printing", spent: 2, planned: 3, amount: "$310 of $600" },
] as const;

const FEATURES = [
  { title: "Budgets and transactions", body: "Plan by term, log spending as it happens." },
  { title: "Reimbursements", body: "Receipts attached, approvals tracked." },
  { title: "Sponsorships", body: "Keep commitments and payments in one list." },
  { title: "Runway", body: "See how far current funds will carry you." },
] as const;

/** The small white widgets under the balance. */
const WIDGET = "flex flex-[1_1_220px] flex-col gap-3 rounded-[22px] bg-paper p-5 max-sm:p-4";

/**
 * The dark panel, inset from the page edges and lit by two banana glows:
 * the pitch beside a mock of the treasurer's widget board, then four
 * feature columns. Phones skip the category widget and put the features
 * two to a row.
 */
export function Finance() {
  return (
    <section id="finance" className="px-[clamp(8px,1.5vw,20px)]">
      <div className="bg-night text-cream relative overflow-hidden rounded-[clamp(24px,3vw,40px)]">
        <div aria-hidden="true">
          <span className="bg-glow-banana-22 absolute -top-[200px] -right-[160px] size-[620px] rounded-full" />
          <span className="bg-glow-banana-10 absolute -bottom-[240px] -left-[160px] size-[520px] rounded-full" />
        </div>
        <div className="relative mx-auto flex max-w-[1240px] flex-col gap-[clamp(40px,6vw,72px)] px-6 py-[clamp(56px,9vw,120px)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-10 sm:gap-14">
            <div className="flex flex-col gap-5 sm:gap-6">
              <span className="bg-banana text-ink self-start rounded-full px-3 py-[5px] text-[13px] font-bold">
                Finance
              </span>
              <h2 className="font-heading text-[clamp(38px,4.8vw,62px)] leading-[1.02] tracking-[-0.035em] text-balance">
                Know where every dollar went,{" "}
                <span className="text-banana">and how long the rest will last.</span>
              </h2>
              <p className="text-dusk max-w-[500px] text-[16px] leading-[1.6] text-pretty sm:text-[18px]">
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
                <div className="flex h-[110px] items-stretch gap-2.5" aria-hidden="true">
                  {MONTHS.map((bar, i) => (
                    <div
                      key={bar.month}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="flex h-full w-full max-w-7 flex-col justify-end gap-[3px]">
                        {bar.pending !== "h-[0%]" && (
                          <span className={cn("bg-butter hatch w-full rounded-md", bar.pending)} />
                        )}
                        <span
                          className={cn(
                            "w-full rounded-md",
                            bar.paid,
                            i === MONTHS.length - 1 ? "bg-banana" : "bg-straw",
                          )}
                        />
                      </span>
                      <span className="text-ink-faint text-[11px]">{bar.month}</span>
                    </div>
                  ))}
                </div>
                <div className="text-ink-soft flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-straw size-2.5 rounded-full" /> Paid
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-butter hatch size-2.5 rounded-full" /> Waiting to be paid
                    back
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className={cn(WIDGET, "max-sm:hidden")}>
                  <span className="text-ink-soft text-[13px]">Budget lines</span>
                  {BUDGET_LINES.map((line) => (
                    <div key={line.name} className="flex flex-col gap-1.5 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{line.name}</span>
                        <span className="text-ink-soft tabular-nums">{line.amount}</span>
                      </div>
                      <div className="flex gap-[3px]" aria-hidden="true">
                        {Array.from({ length: line.planned }, (_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-2.5 flex-1 rounded-full",
                              i < line.spent ? "bg-banana" : "bg-straw",
                            )}
                          />
                        ))}
                      </div>
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
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-leaf text-leaf-ink rounded-full px-2.5 py-[5px] text-[12px] font-bold">
                      Approved
                    </span>
                    <span className="bg-butter hatch text-honey-deep rounded-full px-2.5 py-[5px] text-[12px] font-bold">
                      Waiting to be paid back
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-x-8 sm:gap-y-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border-cream/16 flex flex-col gap-1.5 border-t pt-4"
              >
                <span className="text-[15px] leading-[1.3] font-bold sm:text-[16px]">
                  {feature.title}
                </span>
                <span className="text-ink-ghost text-[14px] leading-[1.5] sm:text-[15px]">
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
