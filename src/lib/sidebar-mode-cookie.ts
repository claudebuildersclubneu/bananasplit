import { cookies } from "next/headers";

import { parseSidebarMode, sidebarCookieName, type SidebarMode } from "@/lib/sidebar-mode";

/**
 * The member's stored sidebar mode, read on the server so the shell renders
 * docked or rail from the first byte (src/lib/sidebar-mode.ts). The browser
 * writes the cookie; a missing or unexpected value is docked.
 */
export async function getSidebarMode(userId: string): Promise<SidebarMode> {
  const store = await cookies();
  return parseSidebarMode(store.get(sidebarCookieName(userId))?.value);
}
