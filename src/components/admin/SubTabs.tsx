"use client";

import { useState } from "react";

// A quiet second-level row of tabs (docs/design/admin.md "Homepage segment
// tabs"): neutral rounded buttons under a SectionTabs row, so the two rows
// don't read as the same level. Unlike StatusTabs, panels are passed in as
// already-rendered elements (so a Server Component page can build them)
// and ALL panels stay mounted — inactive ones are just `hidden`. That
// keeps unsaved typing in other tabs, and since this component's state
// survives revalidatePath() refreshes, a save or upload never bounces the
// owner back to the first tab. Don't give it a data-derived `key`.
//
// Plain buttons on purpose: the ARIA tabs pattern (roles, arrow keys) was
// dropped by user decision (2026-10-05).
export function SubTabs<T extends string>({
  tabs,
  defaultTab,
}: {
  tabs: { key: T; label: string; panel: React.ReactNode }[];
  defaultTab: T;
}) {
  const [active, setActive] = useState<T>(defaultTab);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`min-h-10 rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1A18] dark:focus-visible:outline-[#F3F1EC] ${
                isActive
                  ? "bg-black/[.05] font-medium text-[#1C1A18] dark:bg-white/[.08] dark:text-[#F3F1EC]"
                  : "text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} hidden={tab.key !== active}>
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
