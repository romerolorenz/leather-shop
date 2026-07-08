import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import CartLink from "@/components/CartLink";
import { Tooltip } from "@/components/Tooltip";
import { getCustomerEmail } from "@/lib/customer/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leather Shop",
  description: "Handcrafted leather goods, made in small batches.",
};

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const customerEmail = await getCustomerEmail();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
        >
          Skip to content
        </a>
        <CartProvider>
          <header className="border-b border-black/[.08] dark:border-white/[.145]">
            <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Leather Shop
              </Link>
              <div className="flex items-center gap-6 text-sm">
                <Tooltip label="FAQ">
                  <Link href="/faq" aria-label="FAQ" className="inline-flex">
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
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  </Link>
                </Tooltip>
                <Tooltip label="Contact Us">
                  <Link
                    href="/contact"
                    aria-label="Contact Us"
                    className="inline-flex"
                  >
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
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </Link>
                </Tooltip>
                <Tooltip label="Shop">
                  <Link
                    href="/products"
                    aria-label="Shop"
                    className="inline-flex"
                  >
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
          <div id="main-content" className="flex flex-1 flex-col">
            {children}
          </div>
          <footer className="border-t border-black/[.08] px-6 py-8 dark:border-white/[.145]">
            <nav className="mx-auto flex max-w-3xl flex-wrap gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/products">Shop</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact Us</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </nav>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
