"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function CartLink() {
  const { totalItems } = useCart();

  return (
    <Link href="/cart">
      Cart{totalItems > 0 ? ` (${totalItems})` : ""}
    </Link>
  );
}
