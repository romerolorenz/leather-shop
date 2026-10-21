"use client";

import { useEffect, useRef, useState } from "react";

// Category jump links under "Shop the Collection"
// (docs/design/category-descriptions.md § Jump links). Inline row from
// 640px up; on phones a sticky, sideways-scrolling bar that underlines the
// category in view.
//
// It also publishes two CSS variables on <html> that the page's sticky
// rails and scroll-margins read, so they're measured, not guessed:
//   --shop-header-offset  how much of the viewport top the site header
//                         covers while scrolling (its height when it's
//                         sticky/fixed; 0 while it's in normal flow, as
//                         SiteHeader is today on /products)
//   --shop-jump-height    this bar's height while it's sticky (phones),
//                         else 0
export function ShopJumpNav({
  sections,
}: {
  sections: { id: string; name: string }[];
}) {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id);

  // Measure the site header and this bar.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>("[data-site-header]");

    function measure() {
      let headerOffset = 0;
      if (header) {
        const style = getComputedStyle(header);
        if (style.position === "sticky" || style.position === "fixed") {
          headerOffset =
            header.getBoundingClientRect().height +
            (parseFloat(style.top) || 0);
        }
      }
      const jumpHeight =
        nav && getComputedStyle(nav).position === "sticky"
          ? nav.getBoundingClientRect().height
          : 0;
      root.style.setProperty("--shop-header-offset", `${headerOffset}px`);
      root.style.setProperty("--shop-jump-height", `${jumpHeight}px`);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    if (header) observer.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--shop-header-offset");
      root.style.removeProperty("--shop-jump-height");
    };
  }, []);

  // Track the category in view: the last section whose top has passed the
  // bottom of the sticky chrome (plus a little slack), or the last one
  // once the page is scrolled to the bottom.
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const nav = navRef.current;
      const navBottom =
        nav && getComputedStyle(nav).position === "sticky"
          ? nav.getBoundingClientRect().bottom
          : 0;
      const line = navBottom + 32;
      let current = sections[0]?.id;
      for (const { id } of sections) {
        const el = document.getElementById(`category-${id}`);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) current = sections[sections.length - 1]?.id;
      setActiveId(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  // Keep the active link visible inside the sideways-scrolling phone bar.
  // Scrolls the bar only (not the page), so it can't interrupt the page's
  // own smooth scroll.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const link = nav.querySelector<HTMLElement>('[aria-current="true"]');
    if (!link) return;
    const linkBox = link.getBoundingClientRect();
    const left =
      linkBox.left - nav.getBoundingClientRect().left + nav.scrollLeft;
    const right = left + linkBox.width;
    const padding = 24;
    if (left < nav.scrollLeft + padding) {
      nav.scrollTo({ left: Math.max(0, left - padding) });
    } else if (right > nav.scrollLeft + nav.clientWidth - padding) {
      nav.scrollTo({ left: right - nav.clientWidth + padding });
    }
  }, [activeId]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    // Modified or non-left clicks (new tab/window, download) are left to
    // the browser; only a plain left click becomes a smooth scroll.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = document.getElementById(`category-${id}`);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#category-${id}`);
  }

  return (
    <nav
      ref={navRef}
      aria-label="Categories"
      className="sticky top-[var(--shop-header-offset,0px)] z-10 -mx-6 -mt-2 mb-8 flex flex-nowrap gap-x-6 overflow-x-auto border-b border-[rgba(28,26,24,.12)] bg-white/94 px-6 pt-3.5 pb-2.5 [scrollbar-width:none] dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110]/94 [&::-webkit-scrollbar]:hidden sm:static sm:mx-0 sm:-mt-3 sm:mb-10 sm:flex-wrap sm:gap-y-2 sm:overflow-visible sm:border-b-0 sm:bg-transparent sm:p-0 sm:dark:bg-transparent"
    >
      {sections.map(({ id, name }) => (
        <a
          key={id}
          href={`#category-${id}`}
          onClick={(event) => jump(event, id)}
          aria-current={activeId === id ? "true" : undefined}
          className="whitespace-nowrap border-b border-transparent pb-1 text-xs font-medium uppercase tracking-[0.1em] text-[#6E6A64] hover:border-[#1C1A18] hover:text-[#1C1A18] aria-[current=true]:border-[#1C1A18] aria-[current=true]:text-[#1C1A18] dark:text-[#A39C90] dark:hover:border-[#F3F1EC] dark:hover:text-[#F3F1EC] dark:aria-[current=true]:border-[#F3F1EC] dark:aria-[current=true]:text-[#F3F1EC]"
        >
          {name}
        </a>
      ))}
    </nav>
  );
}
