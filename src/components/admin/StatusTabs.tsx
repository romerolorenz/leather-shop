"use client";

import { useState } from "react";

// Client-only filter tabs over data that's already been fetched in full
// (Orders by status, Promo Codes by active/expired/inactive) — no route
// change, unlike SectionTabs. The dataset is small enough for a small
// shop that fetching everything once and filtering in the browser is
// simpler than paginating per status server-side.
export function StatusTabs<T extends string>({
  tabs,
  defaultTab,
  children,
}: {
  tabs: { key: T; label: string; count: number }[];
  defaultTab: T;
  children: (active: T) => React.ReactNode;
}) {
  const [active, setActive] = useState<T>(defaultTab);

  return (
    <div>
      <div className="mb-6 flex gap-5 border-b border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-current={isActive ? "true" : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#7A3B22] text-[#7A3B22] dark:border-[#C97A4E] dark:text-[#C97A4E]"
                  : "border-transparent text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                  isActive
                    ? "bg-[rgba(85,105,47,.12)] text-[#55692F] dark:bg-[rgba(168,193,126,.16)] dark:text-[#A8C17E]"
                    : "bg-black/[.05] text-[#6E6A64] dark:bg-white/[.08] dark:text-[#A39C90]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
      {children(active)}
    </div>
  );
}
