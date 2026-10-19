import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted rounded-field animate-pulse motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
