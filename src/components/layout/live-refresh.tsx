"use client";

import { useLiveRefresh } from "@/hooks/use-live-refresh";

/** Montira useLiveRefresh unutar layout-a - bez vidljivog UI-ja. */
export function LiveRefresh() {
  useLiveRefresh();
  return null;
}
