"use client";

import { ListFilter, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** `tab` keeps its old name so existing links (`?tab=files`) still land on uploads. */
const KINDS = [
  ["all", "Everything"],
  ["notes", "Notes"],
  ["files", "Uploads"],
] as const;

const AUDIENCES = [
  ["all", "Anyone"],
  ["PRIVATE", "Only me"],
  ["ORGANIZATION", "Everyone in the club"],
] as const;

/**
 * Files › the library's filter and order: one Filter menu (what kind, who
 * can see it, who added it) and a sort. Both live in the URL, so a filtered
 * view can be linked and pinned.
 */
export function NotesListFilters({
  members,
}: {
  /** Display names only: the page sends an email as the name just where the viewer may see emails. */
  members: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kind = searchParams.get("tab") ?? "all";
  const visibility = searchParams.get("visibility") ?? "all";
  const author = searchParams.get("author") ?? "all";
  const active = [kind, visibility, author].filter((v) => v !== "all").length;
  const authorMember = members.find((m) => m.userId === author);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Picking an option keeps the menu open, so several filters can be set in one go.
  const keepOpen = (e: Event) => e.preventDefault();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <ListFilter className="size-4" aria-hidden="true" />
            Filter
            {active > 0 && (
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 text-xs tabular-nums">
                {active}
                <span className="sr-only"> on</span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={kind} onValueChange={(v) => setParams({ tab: v })}>
            {KINDS.map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value} onSelect={keepOpen}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Who can see it</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={visibility}
            onValueChange={(v) => setParams({ visibility: v })}
          >
            {AUDIENCES.map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value} onSelect={keepOpen}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserRound className="size-4" aria-hidden="true" />
              Added by
              <span className="text-muted-foreground ms-auto max-w-28 truncate text-xs">
                {authorMember ? authorMember.name : "Anyone"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={author}
                onValueChange={(v) => setParams({ author: v })}
              >
                <DropdownMenuRadioItem value="all">Anyone</DropdownMenuRadioItem>
                {members.map((m) => (
                  <DropdownMenuRadioItem key={m.userId} value={m.userId}>
                    {m.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {active > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setParams({ tab: null, visibility: null, author: null })}
              >
                Clear filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Select
        value={searchParams.get("sort") ?? "edited"}
        onValueChange={(v) => setParams({ sort: v === "edited" ? null : v })}
      >
        <SelectTrigger size="sm" className="w-40" aria-label="Sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="edited">Recently edited</SelectItem>
          <SelectItem value="created">Newest</SelectItem>
          <SelectItem value="title">Title A–Z</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}
