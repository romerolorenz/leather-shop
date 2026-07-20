"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Route-backed tabs for a group of sibling admin pages that share one
// sidebar entry (Products: Catalog/Categories/Option Library; Content:
// Homepage/FAQ) — real <Link>s, not client-only state, so each tab keeps
// its own server-rendered data fetch and stays bookmarkable/shareable.
export function SectionTabs({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-5 border-b border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-[#7A3B22] text-[#7A3B22] dark:border-[#C97A4E] dark:text-[#C97A4E]"
                : "border-transparent text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
