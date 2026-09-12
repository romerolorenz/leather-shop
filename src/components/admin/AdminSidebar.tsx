"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M6 2h12v18l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M3 3h8l10 10-8 8L3 11V3Z" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M13 2v6h6" /><path d="M9 13h6" /><path d="M9 17h6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8.05 8.05 0 0 0-1.7-1L14.9 3h-4l-.4 2.9a8.05 8.05 0 0 0-1.7 1l-2.5-1-2 3.4L6.4 11a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a8.05 8.05 0 0 0 1.7 1l.4 3h4l.4-3a8.05 8.05 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: () => React.ReactElement;
  matchPrefixes: string[];
  subItems?: { label: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: GridIcon, matchPrefixes: ["/admin"] },
  {
    label: "Products",
    href: "/admin/products",
    icon: BagIcon,
    matchPrefixes: ["/admin/products", "/admin/categories", "/admin/options"],
    subItems: [
      { label: "Catalog", href: "/admin/products" },
      { label: "Categories", href: "/admin/categories" },
      { label: "Option Library", href: "/admin/options" },
    ],
  },
  { label: "Orders", href: "/admin/orders", icon: ReceiptIcon, matchPrefixes: ["/admin/orders"] },
  { label: "Promo Codes", href: "/admin/promo-codes", icon: TagIcon, matchPrefixes: ["/admin/promo-codes"] },
  {
    label: "Content",
    href: "/admin/homepage",
    icon: DocIcon,
    matchPrefixes: ["/admin/homepage", "/admin/faq"],
    subItems: [
      { label: "Homepage", href: "/admin/homepage" },
      { label: "FAQ", href: "/admin/faq" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: GearIcon,
    matchPrefixes: ["/admin/settings", "/admin/payment-methods"],
    subItems: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Payment Methods", href: "/admin/payment-methods" },
    ],
  },
];

// Dashboard's prefix is just "/admin", which would also match every other
// admin route as a substring — it needs an exact check instead of
// startsWith, unlike every other entry.
function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function AdminSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-3.5">
      <Link
        href="/admin"
        className="flex items-baseline gap-2 border-b border-[rgba(28,26,24,.12)] px-2.5 pb-3 dark:border-[rgba(243,241,236,.14)]"
      >
        <span className="text-[1.05rem] font-semibold tracking-tight text-[#7A3B22] dark:text-[#C97A4E]">
          Hiraya
        </span>
        <span className="text-[.7rem] uppercase tracking-[.08em] text-[#6E6A64] dark:text-[#A39C90]">
          Admin
        </span>
      </Link>

      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-[#7A3B22] dark:text-[#C97A4E]"
                    : "text-[#6E6A64] hover:bg-black/[.05] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:bg-white/[.08] dark:hover:text-[#F3F1EC]"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
              {item.subItems && (
                <div className="ml-[26px] mt-0.5 mb-1.5 flex flex-col gap-0.5 border-l border-[rgba(28,26,24,.12)] pl-3 dark:border-[rgba(243,241,236,.14)]">
                  {item.subItems.map((sub) => {
                    const subActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setIsOpen(false)}
                        className={`rounded-md px-1 py-1 text-[.8125rem] transition-colors ${
                          subActive
                            ? "font-medium text-[#7A3B22] dark:text-[#C97A4E]"
                            : "text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgba(28,26,24,.12)] pt-3.5 dark:border-[rgba(243,241,236,.14)]">
        <span className="truncate text-xs text-[#6E6A64] dark:text-[#A39C90]">
          {email}
        </span>
        <form action="/auth/signout" method="post" className="flex-none">
          <button
            type="submit"
            className="text-xs text-[#6E6A64] underline underline-offset-2 hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[rgba(28,26,24,.12)] px-4 py-3 md:hidden dark:border-[rgba(243,241,236,.14)]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          <MenuIcon />
        </button>
        <span className="text-[1.05rem] font-semibold tracking-tight text-[#7A3B22] dark:text-[#C97A4E]">
          Hiraya Admin
        </span>
      </div>

      <aside className="sticky top-0 hidden h-dvh w-60 flex-none border-r border-[rgba(28,26,24,.12)] bg-[#FBFAF8] md:block dark:border-[rgba(243,241,236,.14)] dark:bg-[#171513]">
        {nav}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#FBFAF8] dark:bg-[#171513]">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
