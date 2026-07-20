"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// The admin area is its own app shell (AdminSidebar, src/app/admin/layout.tsx)
// and shouldn't also carry the customer-facing header/footer — this is the
// one place in the tree that knows the route, since RootLayout is a Server
// Component and can't call usePathname() itself.
export function StorefrontChrome({
  customerEmail,
  children,
}: {
  customerEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <SiteHeader customerEmail={customerEmail} />}
      <div id="main-content" className="flex flex-1 flex-col">
        {children}
      </div>
      {!isAdmin && (
        <footer className="border-t border-black/[.08] py-8 dark:border-white/[.145]">
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-6 px-6 text-sm text-zinc-500 sm:px-10 dark:text-zinc-400">
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </nav>
        </footer>
      )}
    </>
  );
}
