"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import type { OrgPlan } from "@/generated/prisma/enums";
import { PLAN_ORDER } from "@/lib/billing/features";
import { cn } from "@/lib/utils";

import { switchPlan } from "./actions";

export interface PlanCard {
  plan: OrgPlan;
  name: string;
  price: string;
  per: string;
  who: string;
  /** "Includes", "Everything in Free, plus". */
  intro: string;
  features: string[];
}

/**
 * The three plans side by side, the current one marked. The owner gets a
 * switch button on the others (with a confirm that says what changes);
 * everyone else sees who can switch.
 */
export function PlanCards({
  orgId,
  current,
  cards,
  canSwitch,
}: {
  orgId: string;
  current: OrgPlan;
  cards: PlanCard[];
  canSwitch: boolean;
}) {
  const router = useRouter();
  const [confirmEl, confirm] = useConfirm();
  const rank = (p: OrgPlan) => PLAN_ORDER.indexOf(p);

  async function choose(card: PlanCard) {
    const down = rank(card.plan) < rank(current);
    const lost = cards
      .filter((c) => rank(c.plan) > rank(card.plan) && rank(c.plan) <= rank(current))
      .flatMap((c) => c.features);
    const ok = await confirm({
      title: `Switch to ${card.name}?`,
      description: down
        ? `These will be locked until you switch back: ${lost.join(", ")}. Nothing is deleted.`
        : "It takes effect right away. Billing isn't connected yet, so nothing is charged.",
      confirmLabel: `Switch to ${card.name}`,
      tone: down ? "destructive" : "default",
      run: async () => {
        const result = await switchPlan(orgId, card.plan);
        return result.error;
      },
    });
    if (!ok) return;
    toast({ title: `Your club is on the ${card.name} plan` });
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const isCurrent = card.plan === current;
          return (
            <div
              key={card.plan}
              className={cn(
                "bg-card flex flex-col gap-4 rounded-xl border p-5",
                isCurrent && "border-primary ring-primary/20 ring-2",
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="heading text-base">{card.name}</h2>
                  {isCurrent && <Badge>Current plan</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">{card.who}</p>
              </div>
              <p className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-2xl font-semibold">{card.price}</span>
                <span className="text-muted-foreground text-sm">{card.per}</span>
              </p>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">{card.intro}</p>
                <ul className="space-y-1.5 text-sm">
                  {card.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto pt-1">
                {isCurrent ? null : canSwitch ? (
                  <Button
                    size="sm"
                    variant={rank(card.plan) > rank(current) ? "default" : "outline"}
                    className="w-full"
                    onClick={() => void choose(card)}
                  >
                    Switch to {card.name}
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-xs">Only the owner can switch plans.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {confirmEl}
    </>
  );
}
