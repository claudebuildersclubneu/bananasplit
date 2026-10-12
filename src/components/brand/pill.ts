import { cva, type VariantProps } from "class-variance-authority";

/**
 * Bananasplit's pill buttons (the design handoff), for buttons and links
 * alike: `pill({ size: "lg", raised: true })`.
 *
 * - tone: `ink` is the page's main action (hover darkens to ink-hover);
 *   `outline` is paper with a hairline (Google, Send a new link, Connect).
 * - size: `sm` 13px chips on a row (Connect, Copy code); `md` 48px (Continue);
 *   `field` 50px, as tall as an input (Google, Send invite); `lg` 52px, the
 *   form's submit (Log in, Create account).
 * - raised: the soft shadow under a form's main action.
 */
export const pill = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-50",
  {
    variants: {
      tone: {
        ink: "bg-ink text-cream hover:bg-ink-hover hover:text-cream border-none",
        outline: "bg-paper text-ink hover:bg-cream border-ink/16 border",
      },
      size: {
        sm: "px-3.5 py-[7px] text-[13px]",
        md: "h-12 px-6 text-[15px]",
        field: "h-[50px] px-5 text-[15px]",
        lg: "h-[52px] px-6 text-[16px]",
      },
      raised: { true: "shadow-cta-soft", false: "" },
    },
    compoundVariants: [{ tone: "outline", size: "sm", className: "border-ink/18" }],
    defaultVariants: { tone: "ink", size: "lg", raised: false },
  },
);

export type PillProps = VariantProps<typeof pill>;
