"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Noto_Sans_Tagalog } from "next/font/google";
import { Tooltip } from "@/components/Tooltip";
import CartLink from "@/components/CartLink";

// Baybayin transliteration of "Hiraya" (Hi-ra-ya), set under the
// wordmark — see docs/design/homepage.md "Branding test" for the
// character-by-character derivation. Needs its own font: Baybayin glyph
// support isn't guaranteed in default system/UI fonts.
const notoTagalog = Noto_Sans_Tagalog({
  subsets: ["tagalog"],
  weight: "400",
});

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
  // The homepage hero fills the viewport (h-dvh) — the header floats over
  // it instead of taking up document-flow space, so it doesn't push the
  // hero image/copy down. Same solid color as every other page either way.
  const isHome = usePathname() === "/";

  return (
    <header
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
        <div className="flex items-center gap-6 text-sm">
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
      </nav>
    </header>
  );
}
