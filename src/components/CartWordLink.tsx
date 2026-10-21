"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

// Desktop (sm+) word version of CartLink: "Cart" or "Cart (n)", set in
// capitals by the shared NAV_WORD classes passed in from SiteHeader.
export default function CartWordLink({
  className,
  current = false,
}: {
  className: string;
  current?: boolean;
}) {
  const { totalItems } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={
        totalItems > 0
          ? `Cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`
          : "Cart"
      }
      aria-current={current ? "page" : undefined}
      className={className}
    >
      Cart
      {totalItems > 0 && (
        <>
          {" "}(<span className="tabular-nums">{totalItems}</span>)
        </>
      )}
    </Link>
  );
}
