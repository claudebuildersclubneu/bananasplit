import { CalendarCheck, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export type PollStatusTone = "open" | "closed" | "scheduled";

/**
 * A poll's state, the same on the list and on the poll itself, for both
 * kinds: a green dot while it takes answers, a lock once it's closed, a
 * calendar tick once a time has been scheduled.
 */
export function PollStatusBadge({ tone, children }: { tone: PollStatusTone; children: ReactNode }) {
  if (tone === "open") {
    return (
      <Badge variant="outline" className="gap-1.5">
        <span aria-hidden className="bg-success size-1.5 rounded-full" />
        {children}
      </Badge>
    );
  }
  const Icon = tone === "scheduled" ? CalendarCheck : Lock;
  return (
    <Badge variant="secondary">
      <Icon aria-hidden />
      {children}
    </Badge>
  );
}
