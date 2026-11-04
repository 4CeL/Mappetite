"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";

/** Height of the always-visible strip: grab handle + header row. */
export const SHEET_HEADER_H = 76;
// Space left above the sheet when it is fully open, so the map still peeks out at the top.
const FULL_GAP = 12;
const DRAG_START_PX = 6;
// How far ahead (ms) a flick is projected when choosing which position to settle on.
const PROJECT_MS = 160;
const ALL_SNAPS = ["collapsed", "half", "full"];

function visibleFor(snap, parentH, halfRatio, fullMax, topGap) {
  if (snap === "collapsed") return SHEET_HEADER_H;
  if (snap === "half") return Math.round(parentH * halfRatio);
  return Math.max(Math.min(parentH - topGap, fullMax ?? Infinity), SHEET_HEADER_H);
}

/**
 * A bottom sheet over the map with up to three resting positions:
 *   collapsed = only the header strip, half = about half the map, full = almost the whole map.
 * It is positioned inside its parent (which must be `position: relative/absolute`) and reports how much of
 * it is showing through the `--mp-sheet-visible` CSS variable on that parent, so map controls can sit above it.
 *
 * Dragging works from anywhere on the sheet, except that once it is fully open the content scrolls instead
 * (drag the header strip to bring it back down).
 *
 * Props: `snap` / `onSnapChange` (controlled), `snaps` (allowed positions), `fullMax` (px cap for the fully open
 * height, for content that is short), `topGap` (px of map left above a fully open sheet), `header` (shown next
 * to the handle), `horizontal` (the content has parts that scroll sideways, e.g. a card carousel or chip row),
 * `label` (accessible name).
 */
export default function BottomSheet({
  snap,
  onSnapChange,
  snaps = ALL_SNAPS,
  halfRatio = 0.5,
  fullMax,
  topGap = FULL_GAP,
  header,
  children,
  label,
  horizontal = false,
  onVisibleChange,
}) {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const gestureRef = useRef(null);
  const [parentH, setParentH] = useState(0);
  const [dragging, setDragging] = useState(false);

  // The map area can change size (rotation, browser toolbars), so keep following it.
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return undefined;
    const observer = new ResizeObserver(() => setParentH(parent.clientHeight));
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Content is only scrollable when fully open; when the sheet comes back down, show its top again.
  useEffect(() => {
    if (snap !== "full" && contentRef.current) contentRef.current.scrollTop = 0;
  }, [snap]);

  const fullH = visibleFor("full", parentH, halfRatio, fullMax, topGap);
  const visible = Math.min(visibleFor(snap, parentH, halfRatio, fullMax, topGap), fullH);
  const restingTransform = `translateY(${fullH - visible}px)`;
  const minVisible = Math.min(...snaps.map((name) => visibleFor(name, parentH, halfRatio, fullMax, topGap)));

  const publishVisible = (px) => {
    rootRef.current?.parentElement?.style.setProperty("--mp-sheet-visible", `${Math.round(px)}px`);
  };

  // Flag the map area while the sheet is fully open: the map's zoom/locate buttons would sit under the search bar.
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return undefined;
    parent.toggleAttribute("data-sheet-full", snap === "full");
    return () => parent.removeAttribute("data-sheet-full");
  }, [snap]);

  // Keep the CSS variable in step with the resting position (drags update it directly), and tell the page
  // how much of the map is covered once the sheet has settled.
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return undefined;
    parent.style.setProperty("--mp-sheet-visible", `${visible}px`);
    onVisibleChange?.(visible);
    return () => parent.style.removeProperty("--mp-sheet-visible");
  }, [visible, onVisibleChange]);

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gestureRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startVisible: visible,
      current: visible,
      active: false,
      ignored: false,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      inContent: Boolean(contentRef.current?.contains(event.target)),
    };
  };

  const onPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId || g.ignored) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (!g.active) {
      if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return;
      // Sideways swipes belong to the card carousel; a fully open sheet lets its content scroll.
      if (Math.abs(dx) > Math.abs(dy) || (g.inContent && snap === "full")) {
        g.ignored = true;
        return;
      }
      g.active = true;
      rootRef.current?.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    const elapsed = event.timeStamp - g.lastT;
    if (elapsed > 0) g.velocity = (event.clientY - g.lastY) / elapsed;
    g.lastY = event.clientY;
    g.lastT = event.timeStamp;

    // A little resistance past the lowest position instead of a hard stop.
    const next = Math.min(Math.max(g.startVisible - dy, minVisible - 24), fullH);
    g.current = next;
    if (rootRef.current) rootRef.current.style.transform = `translateY(${fullH - next}px)`;
    publishVisible(next);
  };

  const finishGesture = (event) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId) return;
    gestureRef.current = null;
    if (!g.active) return;
    setDragging(false);

    // A flick carries on; a drag that paused before the finger lifted settles where it is.
    const velocity = event.timeStamp - g.lastT > 80 ? 0 : g.velocity;
    const projected = g.current - velocity * PROJECT_MS;
    let target = snaps[0];
    let best = Infinity;
    snaps.forEach((name) => {
      const distance = Math.abs(visibleFor(name, parentH, halfRatio, fullMax, topGap) - projected);
      if (distance < best) {
        best = distance;
        target = name;
      }
    });

    // The dragged inline style would win over React's value if the position did not change, so set it here too.
    const settled = Math.min(visibleFor(target, parentH, halfRatio, fullMax, topGap), fullH);
    if (rootRef.current) rootRef.current.style.transform = `translateY(${fullH - settled}px)`;
    publishVisible(settled);
    onSnapChange(target);
  };

  const toggle = () => {
    const order = snaps.filter((name) => name !== "collapsed");
    if (snap === "collapsed") onSnapChange(order[0] ?? "half");
    else if (snap === "full" && snaps.includes("half")) onSnapChange("half");
    else onSnapChange(snaps.includes("full") ? "full" : snap);
  };

  let contentTouchAction = "none";
  if (snap === "full") contentTouchAction = horizontal ? "pan-x pan-y" : "pan-y";
  else if (horizontal) contentTouchAction = "pan-x";

  return (
    <section
      ref={rootRef}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[1.75rem] border-t border-line bg-cream shadow-sheet motion-reduce:transition-none lg:hidden"
      style={{
        height: fullH,
        transform: restingTransform,
        transition: dragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        visibility: parentH === 0 ? "hidden" : "visible",
        willChange: "transform",
      }}
    >
      <div className="shrink-0 select-none" style={{ height: SHEET_HEADER_H, touchAction: "none" }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={snap === "full" ? t("sheet.collapse") : t("sheet.expand")}
          aria-expanded={snap !== "collapsed"}
          className="flex h-6 w-full cursor-grab items-center justify-center active:cursor-grabbing"
        >
          <span className="h-1.5 w-11 rounded-full bg-stone-300" aria-hidden="true" />
        </button>
        <div className="flex h-[3.25rem] items-center px-4">{header}</div>
      </div>

      <div
        ref={contentRef}
        className="min-h-0 flex-1 overscroll-contain"
        style={{ overflowY: snap === "full" ? "auto" : "hidden", touchAction: contentTouchAction }}
      >
        {children}
      </div>
    </section>
  );
}
