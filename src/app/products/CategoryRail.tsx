"use client";

import { useEffect, useRef } from "react";

const DESKTOP = "(min-width: 900px)";

// The desktop side rail of a /products category section
// (docs/design/category-descriptions.md § Agreed layout → Desktop).
//
// The rail is `position: sticky`, and a sticky element can only travel to
// the bottom of its containing block. So it sits in a wrapper whose height
// is measured to end exactly one rail-height below the top of the last
// row's photos: the rail stays pinned until its top reaches that line,
// then scrolls away with the products.
//
// Measured from the last <li> of the sibling product grid (marked
// `data-rail-grid`): every card in a row starts at the same line and the
// photo is the top of the card, so the last <li>'s top is the last row's
// photo top, however many cards that row has. The <li> is used rather than
// the photo itself because the card's fade-in (Reveal) translates its
// contents while they animate.
//
// Before this runs (SSR, no JS) and below 900px the wrapper keeps its
// natural size, which at ≥ 900px stretches to the section's height: the
// original "pinned to the end of the section". The measured height is never
// more than that, so setting it can't move anything else on the page. If
// the rail is taller than the room it has, it just scrolls normally.
export function CategoryRail({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const rail = railRef.current;
    const grid = wrapper?.parentElement?.querySelector<HTMLElement>(
      ":scope > [data-rail-grid]"
    );
    if (!wrapper || !rail || !grid) return;
    const desktop = window.matchMedia(DESKTOP);
    let frame = 0;

    function measure() {
      frame = 0;
      const lastCard = grid!.lastElementChild;
      if (!desktop.matches || !lastCard) {
        wrapper!.style.removeProperty("--rail-stop");
        return;
      }
      const top = wrapper!.getBoundingClientRect().top;
      const railHeight = rail!.getBoundingClientRect().height;
      const lastRowTop = lastCard.getBoundingClientRect().top - top;
      const gridBottom = grid!.getBoundingClientRect().bottom - top;
      const height = Math.max(
        railHeight,
        Math.min(lastRowTop + railHeight, gridBottom)
      );
      wrapper!.style.setProperty("--rail-stop", `${height}px`);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    // The grid resizes when the viewport does, and as photos, fonts and
    // sold-out tags settle; the rail when its text reflows. Setting the
    // wrapper's height changes neither, so this can't loop.
    const observer = new ResizeObserver(schedule);
    observer.observe(grid);
    observer.observe(rail);
    desktop.addEventListener("change", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      desktop.removeEventListener("change", schedule);
      window.removeEventListener("resize", schedule);
      wrapper.style.removeProperty("--rail-stop");
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="mb-6 min-[900px]:mb-0 min-[900px]:h-[var(--rail-stop,auto)] min-[900px]:self-stretch"
    >
      <div
        ref={railRef}
        className="min-[900px]:sticky min-[900px]:top-[calc(var(--shop-header-offset,0px)+24px)]"
      >
        {children}
      </div>
    </div>
  );
}
