import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/*
 * Chips (Moonstone): 24px pills. `secondary` is the count chip; `accent`,
 * `success`, `info` and `destructive` are tints mixed into the surface with
 * an ink that reads on them (derive.ts tint-* tokens). Tags with their own
 * colour use <TagChip> (src/components/ui/chip.tsx).
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 text-xs font-semibold whitespace-nowrap tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3.5! [&>svg]:stroke-[2.2]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        secondary: "bg-secondary text-muted-foreground [a]:hover:bg-muted-strong",
        accent: "bg-tint-accent text-tint-accent-foreground",
        success: "bg-tint-success text-tint-success-foreground",
        info: "bg-tint-info text-tint-info-foreground",
        destructive: "bg-tint-danger text-tint-danger-foreground [a]:hover:bg-tint-danger/80",
        outline: "border-border text-foreground [a]:hover:bg-muted",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
