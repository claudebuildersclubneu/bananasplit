import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A native <select> that lines up with Input and SelectTrigger (40px, field
 * corners, the surface colour, the glow focus ring). For the settings forms
 * that keep a plain select (long lists such as timezones).
 */
export const nativeSelectClass =
  "border-input bg-card rounded-field focus-visible:border-foreground h-10 w-full min-w-0 border px-3 text-sm transition-colors outline-none focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--glow)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

/**
 * One settings form card (Moonstone): a title and a line about it on space
 * (no rule), the fields, and a footer with the card's one primary Save on
 * the right and its status line on the left. Wrap it in the <form> so the
 * footer's submit button belongs to it:
 *
 *   <form onSubmit={...}>
 *     <SettingsCard title="Name" footer={<Button type="submit">Save</Button>} status={...}>
 *       <Input ... />
 *     </SettingsCard>
 *   </form>
 *
 * With an `id`, the card is a labelled region (its title names it) and an
 * anchor (`#id`) that clears the sticky chrome.
 */
export function SettingsCard({
  title,
  description,
  action,
  footer,
  status,
  children,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Top right: a ••• menu or a small outline button. */
  action?: ReactNode;
  /** The card's one primary action (Save), right-aligned. */
  footer?: ReactNode;
  /** A one-line result ("Name saved.") beside the footer. */
  status?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <Card
      id={id}
      role={id ? "region" : undefined}
      aria-labelledby={titleId}
      className={cn("scroll-mt-24", className)}
    >
      <CardHeader>
        <CardTitle>
          <h2 id={titleId}>{title}</h2>
        </CardTitle>
        {description && <CardDescription className="max-w-prose">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children && <CardContent className="space-y-4">{children}</CardContent>}
      {(footer || status) && (
        <CardFooter className="flex-wrap justify-end gap-x-4 gap-y-2">
          {status && <div className="mr-auto min-w-0 text-sm">{status}</div>}
          {footer && <div className="flex flex-wrap items-center gap-2">{footer}</div>}
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * A settings status line: "Saved." in the success ink, an error in the
 * danger ink. Announced politely; renders nothing when there's no status.
 */
export function SettingsStatus({
  status,
}: {
  status: { tone: "ok" | "error" | "info"; text: string } | null | undefined;
}) {
  if (!status) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "text-sm",
        status.tone === "error" && "text-destructive",
        status.tone === "ok" && "text-success",
        status.tone === "info" && "text-muted-foreground",
      )}
    >
      {status.text}
    </p>
  );
}
