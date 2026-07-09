import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import SiteHeader from "@/components/SiteHeader";
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
          <SiteHeader customerEmail={customerEmail} />
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
