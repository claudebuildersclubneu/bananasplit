import { cva, type VariantProps } from "class-variance-authority";

/**
 * Bananasplit's pill buttons on its own pages, for buttons and links alike:
 * `pill({ tone: "glow" })`. Moonstone tokens throughout, so they follow
 * dark and light (and the cream look, src/app/brand.css).
 *
 * - tone: `ink` is the page's main action, the primary (pearl on dark, ink
 *   on light); `glow` is the one create action, the accent with the glow
 *   halo ("Create your club"); `outline` is a hairline pill (Google, Send a
 *   new link, Connect).
 * - size: Moonstone's two control sizes. `sm` is 32px (chips on a row:
 *   Connect, Copy code); `md`, `field` and `lg` are all 40px now, kept as
 *   names so older call sites line up. 40px controls grow to 44px on touch
 *   screens (redesign guide 5.3).
 * - raised: kept for older call sites; Moonstone buttons sit flat.
 */
export const pill = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 ease-(--ease-ink) select-none active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--glow)_45%,transparent)] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        ink: "bg-primary text-primary-foreground hover:bg-primary-hover",
        glow: "bg-brand-accent text-brand-accent-foreground glow-halo hover:bg-[color-mix(in_oklab,var(--brand-accent)_88%,var(--background))]",
        outline: "border-input text-foreground hover:bg-muted border bg-transparent",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-[18px] text-[14px] pointer-coarse:h-11",
        field: "h-10 px-[18px] text-[14px] pointer-coarse:h-11",
        lg: "h-10 px-5 text-[15px] pointer-coarse:h-11",
      },
      raised: { true: "", false: "" },
    },
    defaultVariants: { tone: "ink", size: "lg", raised: false },
  },
);

export type PillProps = VariantProps<typeof pill>;
