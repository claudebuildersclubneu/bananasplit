import { cn } from "@/lib/utils";

/** A section's headline: Young Serif, 38 to 64px. */
export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-[clamp(38px,5vw,64px)] leading-[1.02] tracking-[-0.03em]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/**
 * The headline on the left and a short description bottom-right, wrapping
 * to stack on narrow screens (the feature board and the growth stages).
 */
export function SectionIntro({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  /** The description's width (and wrapping). */
  className?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
      <div className="flex max-w-[700px] flex-col gap-[18px]">
        <SectionTitle className="text-balance">{title}</SectionTitle>
      </div>
      <p className={cn("text-ink-muted text-[17px] leading-[1.55]", className)}>{children}</p>
    </div>
  );
}
