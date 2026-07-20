import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/components/ToastProvider";
import { StorefrontChrome } from "@/components/StorefrontChrome";
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
        <ToastProvider>
          <CartProvider>
            <StorefrontChrome customerEmail={customerEmail}>
              {children}
            </StorefrontChrome>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
