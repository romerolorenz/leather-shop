import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import CartLink from "@/components/CartLink";
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
                <Link href="/faq">FAQ</Link>
                <Link href="/contact">Contact Us</Link>
                <Link href="/products" aria-label="Shop">
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
                {customerEmail ? (
                  <Link href="/account" aria-label="My Account">
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
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="8" r="5" />
                    </svg>
                  </Link>
                ) : (
                  <Link href="/login?next=/account">Log In</Link>
                )}
                <CartLink />
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
