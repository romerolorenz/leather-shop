"use client";

import { useEffect, useId, useRef, useState } from "react";

// A cart/checkout line's special request (docs/design/custom-requests.md
// §2): "{label}: {note}", clamped to two lines, with a "Show all" / "Show
// less" button only when the note actually overflows. Expands in place, no
// motion. The clamp is visual only, so screen readers always get the full
// text; the button is for sighted users. Plain text: React escapes it.
export function CustomRequestNote({
  label,
  note,
  size = "sm",
}: {
  label: string;
  note: string;
  size?: "sm" | "xs";
}) {
  const id = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Re-measured on resize (a narrower column wraps into more lines). Only
  // while clamped: once expanded, the button must stay to collapse it.
  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, note]);

  return (
    <div className={`mt-1 ${size === "xs" ? "text-xs" : "text-sm"}`}>
      <p
        ref={textRef}
        id={id}
        className={`whitespace-pre-line [overflow-wrap:anywhere] text-[#6E6A64] dark:text-[#A39C90] ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        <span className="font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
          {label}:
        </span>{" "}
        {note}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className="-my-3 py-3 text-sm text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}
