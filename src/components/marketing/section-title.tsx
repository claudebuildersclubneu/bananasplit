import { cn } from "@/lib/utils";

/** A section's headline: the display face, 34 to 56px, set tight. */
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
        "display-title text-[clamp(34px,4.6vw,56px)] leading-[1.0] tracking-[-0.04em]",
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
    <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
      <SectionTitle className="max-w-[700px]">{title}</SectionTitle>
      <p className={cn("text-muted-foreground text-[17px] leading-[1.55]", className)}>
        {children}
      </p>
    </div>
  );
}

/** The page's column: 1240px, a 40px gutter (16 on phones). */
export const CONTAINER = "mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10";
