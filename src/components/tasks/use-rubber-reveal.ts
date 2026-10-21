"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** How far (in wheel or finger pixels) you pull before the details come. */
const THRESHOLD = 140;
/** How much of the pull the content follows: the rubber band's give. */
const GIVE = 0.35;
/** Let go this long after the last wheel tick. */
const SETTLE_MS = 160;

/**
 * A rubber band between a form's essentials and its details (New task):
 * at the top, scrolling down stretches the content a little, with
 * resistance, and springs back when you stop, unless you pulled past the
 * threshold, in which case the scroller glides on to the details. Below
 * that, it scrolls normally, and back at the top the band is set again.
 * Keyboard focus moving into the details reveals them too. Under reduced
 * motion there is no stretch: a pull past the threshold just scrolls.
 *
 * Returns the offset to translate the content by (negative while pulling),
 * whether it is springing back (for the transition), and the scroller's
 * height, so each half can be exactly one window tall.
 */
export function useRubberReveal(
  scroller: RefObject<HTMLElement | null>,
  details: RefObject<HTMLElement | null>,
): { offset: number; springing: boolean; reveal: () => void; pageHeight: number | null } {
  const [offset, setOffset] = useState(0);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [springing, setSpringing] = useState(false);
  const pull = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchY = useRef<number | null>(null);

  const reveal = useCallback(() => {
    pull.current = 0;
    setSpringing(true);
    setOffset(0);
    details.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [details]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setPageHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scroller]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const atTop = () => el.scrollTop <= 1;

    const release = () => {
      if (pull.current >= THRESHOLD) reveal();
      else {
        pull.current = 0;
        setSpringing(true);
        setOffset(0);
      }
    };
    const stretch = (delta: number) => {
      pull.current = Math.max(0, pull.current + delta);
      setSpringing(false);
      if (!reduced) setOffset(-Math.min(pull.current, THRESHOLD * 1.4) * GIVE);
    };

    const onWheel = (e: WheelEvent) => {
      if (!atTop() || e.deltaY <= 0 || e.ctrlKey) return;
      // A select or textarea scrolling its own content keeps its wheel.
      if ((e.target as Element | null)?.closest("textarea, [role='listbox']")) return;
      e.preventDefault();
      stretch(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(release, SETTLE_MS);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY.current = atTop() ? (e.touches[0]?.clientY ?? null) : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY.current === null) return;
      const y = e.touches[0]?.clientY ?? touchY.current;
      const delta = touchY.current - y;
      if (delta <= 0) return;
      e.preventDefault();
      touchY.current = y;
      stretch(delta);
    };
    const onTouchEnd = () => {
      if (touchY.current === null) return;
      touchY.current = null;
      release();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (details.current?.contains(e.target as Node)) {
        pull.current = 0;
        setOffset(0);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("focusin", onFocusIn);
    return () => {
      if (settle.current) clearTimeout(settle.current);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("focusin", onFocusIn);
    };
  }, [scroller, details, reveal]);

  return { offset, springing, reveal, pageHeight };
}
