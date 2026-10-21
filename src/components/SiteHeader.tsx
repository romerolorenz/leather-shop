"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Noto_Sans_Tagalog } from "next/font/google";
import { Tooltip } from "@/components/Tooltip";
import CartLink from "@/components/CartLink";
import CartWordLink from "@/components/CartWordLink";

// Baybayin transliteration of "Hiraya" (Hi-ra-ya), set under the
// wordmark — see docs/design/homepage.md "Branding test" for the
// character-by-character derivation. Needs its own font: Baybayin glyph
// support isn't guaranteed in default system/UI fonts.
const notoTagalog = Noto_Sans_Tagalog({
  subsets: ["tagalog"],
  weight: "400",
});

// Desktop (sm+) word links; see docs/design/header-nav.md. Source text is
// normal case, `uppercase` sets the capitals so screen readers read words.
const NAV_WORD =
  "inline-flex items-center py-2 text-xs font-medium uppercase tracking-[0.1em] text-[#1C1A18] dark:text-[#F3F1EC] underline-offset-[6px] decoration-1 hover:underline hover:decoration-[rgba(28,26,24,.35)] dark:hover:decoration-[rgba(243,241,236,.4)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7A3B22] dark:focus-visible:outline-[#C97A4E]";
const NAV_WORD_CURRENT =
  " underline decoration-[#1C1A18] dark:decoration-[#F3F1EC]";

function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Same icon for both the logged-in (My Account) and logged-out (Log In)
// header nav states — the destination differs, the glyph doesn't.
function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66" />
    </svg>
  );
}

export default function SiteHeader({
  customerEmail,
}: {
  customerEmail: string | null;
}) {
  // The homepage hero fills the viewport (h-svh, so it doesn't resize as the
  // mobile browser bar shows/hides) — the header floats over
  // it instead of taking up document-flow space, so it doesn't push the
  // hero image/copy down. Same solid color as every other page either way.
  const pathname = usePathname();
  const isHome = pathname === "/";
  const wordClass = (current: boolean) =>
    current ? NAV_WORD + NAV_WORD_CURRENT : NAV_WORD;
  const shopCurrent = isUnder(pathname, "/products");
  const accountCurrent = customerEmail
    ? isUnder(pathname, "/account")
    : pathname === "/login";
  const cartCurrent = pathname === "/cart";

  return (
    <header
      // Read by /products' ShopJumpNav to measure how much the header
      // covers if it's ever sticky, so the shop's sticky rails clear it.
      data-site-header
      className={`${isHome ? "absolute inset-x-0 top-0 z-20 " : ""}border-b border-black/[.08] bg-white/80 dark:border-white/[.145] dark:bg-[#121110]/80`}
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10"
      >
        <Link href="/" aria-label="Hiraya, home" className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold tracking-tight text-[#7A3B22] dark:text-[#C97A4E]">
            Hiraya
          </span>
          <span
            lang="tl"
            aria-hidden="true"
            className={`${notoTagalog.className} text-xl text-[#6E6A64] dark:text-[#A39C90]`}
          >
            ᜑᜒᜇᜌ
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm sm:hidden">
          <Tooltip label="Shop">
            <Link href="/products" aria-label="Shop" className="inline-flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </Link>
          </Tooltip>
          {customerEmail ? (
            <Tooltip label="My Account">
              <Link
                href="/account"
                aria-label="My Account"
                className="inline-flex"
              >
                <UserIcon />
              </Link>
            </Tooltip>
          ) : (
            <Tooltip label="Log In">
              <Link
                href="/login?next=/account"
                aria-label="Log In"
                className="inline-flex"
              >
                <UserIcon />
              </Link>
            </Tooltip>
          )}
          <Tooltip label="Cart">
            <CartLink />
          </Tooltip>
        </div>
        <div className="hidden items-center gap-8 sm:flex">
          <Link
            href="/products"
            aria-current={shopCurrent ? "page" : undefined}
            className={wordClass(shopCurrent)}
          >
            Shop
          </Link>
          <Link
            href={customerEmail ? "/account" : "/login?next=/account"}
            aria-current={accountCurrent ? "page" : undefined}
            className={wordClass(accountCurrent)}
          >
            {customerEmail ? "Account" : "Log In"}
          </Link>
          <CartWordLink
            className={wordClass(cartCurrent)}
            current={cartCurrent}
          />
        </div>
      </nav>
    </header>
  );
}
