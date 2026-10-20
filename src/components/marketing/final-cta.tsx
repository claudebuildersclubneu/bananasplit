import { ArrowRight } from "@/components/brand/arrows";
import { CoreMark } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/**
 * The closing panel: a shell-sized card with the banana glow rising from
 * below, the mark in its own colours, the headline and the one create
 * action.
 */
export function FinalCta() {
  return (
    <section className="px-[clamp(8px,1.5vw,20px)]">
      <div className="bg-card text-card-foreground edge ring-foreground/6 glow-rise rounded-shell relative overflow-hidden ring-1">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 py-[clamp(64px,9vw,120px)] text-center">
          <CoreMark size={56} />
          <h2 className="display-title max-w-[820px] text-[clamp(36px,5vw,64px)] leading-[1.0] tracking-[-0.04em]">
            Split the work. Keep the club together.
          </h2>
          <p className="text-muted-foreground max-w-[460px] text-[17px] leading-[1.55]">
            Guided setup walks you through data, tags, finance and teams. Invite your officers with
            a code.
          </p>
          <a href="#pricing" className={cn(pill({ tone: "glow" }), "mt-1 h-11 px-6 text-[15px]")}>
            Create your club <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
