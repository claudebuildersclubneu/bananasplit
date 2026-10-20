import { ArrowRight } from "@/components/brand/arrows";
import { cn } from "@/lib/utils";

import { type Avatar, AvatarStack } from "./avatar-stack";
import { Screenshot } from "./screenshot";

const GOING: readonly Avatar[] = [{ tone: "bg-banana" }, { tone: "bg-wheat" }, { tone: "bg-ink" }];

/**
 * A proof card floating over the screenshot. There's no room for them on
 * narrow screens (they'd cover the screenshot), so they only show from 1024px
 * (CSS, not a resize listener).
 */
function FloatCard({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border-ink/8 bg-paper shadow-float absolute hidden items-center gap-3 rounded-2xl border px-4 py-3.5 text-left lg:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A floating card's two lines: what happened, and where. */
function CardText({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[14px] font-bold">{title}</span>
      <span className="text-ink-soft text-[13px]">{detail}</span>
    </span>
  );
}

/**
 * The headline over a cream-to-banana gradient, then the product: the
 * Overview in a browser frame with Tasks on a phone overlapping its
 * bottom-right corner, the section cropping the phone's last 32px. On
 * phones only the phone shows, centred, its lower part cropped.
 */
export function Hero() {
  return (
    <section className="bg-hero relative overflow-hidden">
      <div aria-hidden="true" className="bg-hero-grid absolute inset-0" />
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 pt-[clamp(56px,7vw,88px)] text-center">
        <h1 className="font-heading max-w-[940px] text-[clamp(42px,6.4vw,84px)] leading-none tracking-[-0.035em] text-balance">
          Running your club shouldn&apos;t be bananas.
        </h1>
        <p className="text-ink-muted max-w-[600px] text-[clamp(18px,1.6vw,21px)] leading-[1.55] text-pretty">
          Tasks, availability polls, RSVPs, notes, databases and the club budget in one workspace.
          Replace the pile of apps your board juggles today.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-3">
          <a
            href="#pricing"
            className="bg-ink text-cream shadow-cta hover:bg-ink-hover hover:text-cream inline-flex items-center gap-2.5 rounded-full px-[26px] py-4 text-[16px] font-semibold whitespace-nowrap"
          >
            Create your club <ArrowRight />
          </a>
        </div>

        <div className="relative mt-4 w-full px-[clamp(0px,5vw,72px)] sm:mt-8">
          <div className="border-ink/12 bg-paper shadow-browser hidden overflow-hidden rounded-t-[18px] border border-b-0 sm:block">
            <div className="border-ink/8 flex h-10 items-center gap-[7px] border-b px-4">
              <span className="bg-straw size-2.5 rounded-full" />
              <span className="bg-straw size-2.5 rounded-full" />
              <span className="bg-straw size-2.5 rounded-full" />
              <span className="bg-oat text-ink-faint mx-auto rounded-md px-10 py-[3px] font-mono text-[12px]">
                bananasplit.fyi
              </span>
            </div>
            <Screenshot
              src="/marketing/app-overview.webp"
              eager
              alt="A club's Overview: open tasks, the next meeting and what's up next this week"
              sizes="(min-width: 1240px) 1100px, 90vw"
              className="aspect-[16/8.5]"
            />
          </div>

          <FloatCard className="top-[18%] left-0">
            <span className="bg-banana text-ink grid size-[34px] place-items-center rounded-full text-[15px] font-extrabold">
              ✓
            </span>
            <CardText title="Venue booked" detail="Maya · Fall Showcase" />
          </FloatCard>
          <FloatCard className="top-[56%] left-[3%]">
            <AvatarStack avatars={GOING} itemClassName="border-paper size-[26px]" overlap="-ml-2" />
            <CardText title="34 going" detail="General meeting, Thu 6pm" />
          </FloatCard>
          <FloatCard className="right-[clamp(140px,22vw,290px)] bottom-6">
            <span className="flex flex-col gap-0.5">
              <span className="text-ink-soft text-[12px]">Budget left this term</span>
              <span className="font-heading text-[24px] tracking-[-0.02em]">$1,240</span>
            </span>
            <span className="bg-leaf text-leaf-ink rounded-full px-[9px] py-1 text-[12px] font-bold whitespace-nowrap">
              9 weeks runway
            </span>
          </FloatCard>

          <div className="bg-ink shadow-phone relative mx-auto -mb-[38%] aspect-[9/18] w-[min(240px,70vw)] rounded-[38px] p-2 sm:absolute sm:right-[clamp(0px,2vw,24px)] sm:-bottom-8 sm:mx-0 sm:mb-0 sm:w-[clamp(140px,21vw,270px)] sm:rounded-[clamp(30px,4vw,44px)] sm:p-[clamp(6px,0.8vw,9px)]">
            <Screenshot
              src="/marketing/app-tasks-phone.webp"
              eager
              alt="Tasks on a phone: open work grouped by epic"
              sizes="270px"
              className="size-full rounded-[30px] sm:rounded-[clamp(24px,3.3vw,36px)]"
            >
              <span
                aria-hidden="true"
                className="bg-void absolute top-2.5 left-1/2 h-5 w-[34%] -translate-x-1/2 rounded-full sm:top-[clamp(7px,1vw,11px)] sm:h-[clamp(14px,1.9vw,24px)]"
              />
            </Screenshot>
          </div>
        </div>
      </div>
    </section>
  );
}
