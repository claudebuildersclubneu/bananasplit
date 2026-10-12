import { CoreMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The Bananasplit mark ("The Core", public/brand/bananasplit-mark.svg): a
 * banana cut across, in the brand's own colours whatever the club's theme,
 * like any product logo. Size it with a size-* class. Decorative: pair it
 * with the name.
 */
export function BananasplitMark({ className }: { className?: string }) {
  return <CoreMark className={cn("size-8", className)} />;
}
