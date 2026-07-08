import Link from "next/link";
import { listProductsForAdmin } from "@/lib/admin/catalog";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Products" }]}
      />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          New product
        </Link>
      </div>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {products.map((product) => {
          return (
            <li key={product.id} className="py-4">
              <Link
                href={`/admin/products/${product.id}`}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {product.category} · {formatPrice(product.priceCentavos)}{" "}
                    · stock: {product.stockQuantity}
                  </p>
                </div>
                {!product.orderingEnabled && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Paused</span>
                )}
              </Link>
            </li>
          );
        })}
        {products.length === 0 && (
          <li className="py-4 text-sm text-zinc-500 dark:text-zinc-400">No products yet.</li>
        )}
      </ul>
    </main>
  );
}
