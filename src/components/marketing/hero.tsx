import { ArrowRight } from "@/components/brand/arrows";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

import { HeroBoard } from "./hero-board";
import { CONTAINER } from "./section-title";

/**
 * The headline in the banana glow (hero-light: the light behind the top of
 * the page, brighter than the app's corona), then the product: a club's
 * Overview drawn with the app's own block cards and cards, so it wears the
 * same tokens as the page in dark and light.
 */
export function Hero() {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="hero-light pointer-events-none absolute inset-x-0 -top-20 h-[760px]"
      />
      <div
        className={cn(
          CONTAINER,
          "relative flex flex-col items-center gap-6 pt-[clamp(48px,8vw,104px)] text-center",
        )}
      >
        <p className="text-muted-foreground text-[15px] font-medium">
          The workspace for student clubs
        </p>
        <h1 className="font-heading max-w-[1040px] text-[clamp(46px,8.2vw,108px)] leading-[0.94] font-[680] tracking-[-0.04em] text-balance">
          Running your club shouldn&apos;t be bananas
          <span className="glow-text font-[300]">.</span>
        </h1>
        <p className="text-muted-foreground max-w-[600px] text-[clamp(17px,1.6vw,20px)] leading-[1.5] text-pretty">
          Tasks, availability polls, RSVPs, notes, databases and the club budget in one workspace.
          Replace the pile of apps your board juggles today.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2.5">
          <a href="#pricing" className={cn(pill({ tone: "glow" }), "h-11 px-6 text-[15px]")}>
            Create your club <ArrowRight />
          </a>
          <a href="#features" className={cn(pill({ tone: "outline" }), "h-11 px-6 text-[15px]")}>
            See what&apos;s inside
          </a>
        </div>
      </div>
      <HeroBoard />
    </section>
  );
}
