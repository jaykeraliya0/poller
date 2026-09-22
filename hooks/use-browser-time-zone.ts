"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The viewer's time zone, or null during server rendering and hydration. */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    () => null,
  );
}
