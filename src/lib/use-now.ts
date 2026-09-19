"use client";
import { useEffect, useState } from "react";

/**
 * A ticking "now" (epoch ms). Pass the server-rendered instant so hydration
 * matches; it then follows the browser clock. Used for live room status and
 * for enabling Check in the moment its window opens.
 */
export function useNow(initialMs?: number, intervalMs = 20_000): number {
  const [now, setNow] = useState(() => initialMs ?? Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Sync to the browser clock right after hydration, then keep ticking; also catch up when a
    // tab that slept in the background (or a page restored from the back button) becomes visible.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}
