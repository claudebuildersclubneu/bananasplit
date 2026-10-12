"use client";

import { CalendarRange, ChevronDown, Plus, Vote, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Choice {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The two kinds of poll a member can start. */
const CHOICES: readonly Choice[] = [
  {
    path: "/calendar/polls/ask",
    label: "Ask a question",
    description: "Give options and let the club vote.",
    icon: Vote,
  },
  {
    path: "/calendar/polls/new",
    label: "Find a time",
    description: "Offer days and hours; see when people are free.",
    icon: CalendarRange,
  },
];

/**
 * The polls page's one create action, "New poll": a question or a
 * find-a-time poll. The empty page leans on it too, so there's no second
 * pair of buttons for the same two choices.
 */
export function NewPollMenu({ orgSlug }: { orgSlug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden className="size-4" />
          New poll
          <ChevronDown aria-hidden className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          return (
            <DropdownMenuItem
              key={choice.path}
              asChild
              className="items-start gap-3 rounded-md p-2.5"
            >
              <Link href={`/app/${orgSlug}${choice.path}`}>
                <Icon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{choice.label}</span>
                  <span className="text-muted-foreground text-xs">{choice.description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
