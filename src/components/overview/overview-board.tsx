"use client";

import type { ReactNode } from "react";

import { saveBoardAction } from "@/app/app/[orgSlug]/_shell/board-actions";
import { WidgetBoard } from "@/components/boards/widget-board";
import type { BoardWidget, WidgetMeta } from "@/lib/boards";

/** The Overview as the member's own board of widgets (the shared WidgetBoard). */
export function OverviewBoard({
  orgId,
  types,
  initialLayout,
  customized,
  bodies,
  headerActions,
  intro,
  stats,
  notice,
}: {
  orgId: string;
  types: WidgetMeta[];
  initialLayout: BoardWidget[];
  customized: boolean;
  bodies: Record<string, ReactNode>;
  /** Each card's header controls (count chip, ↗), by widget type. */
  headerActions?: Record<string, ReactNode>;
  /** The page's greeting, on the Customize button's row. */
  intro?: ReactNode;
  /** The stat strip under the greeting. */
  stats?: ReactNode;
  /** The admin's setup prompt or the new club's invite card, above the widgets. */
  notice?: ReactNode;
}) {
  return (
    <WidgetBoard
      types={types}
      initialLayout={initialLayout}
      customized={customized}
      bodies={bodies}
      headerActions={headerActions}
      intro={intro}
      belowIntro={stats}
      notice={notice}
      onSave={(layout) => saveBoardAction(orgId, "overview", layout)}
    />
  );
}
