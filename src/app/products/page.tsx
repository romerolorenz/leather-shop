import Link from "next/link";
import { getProducts, formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Shop the collection
      </h1>
      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.slug}>
            <Link href={`/products/${product.slug}`} className="block">
              <div className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
              <h2 className="mt-3 font-medium">{product.name}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatPrice(product.priceCentavos)}
              </p>
              {!product.orderingEnabled && (
                <p className="text-sm text-zinc-500">Currently unavailable</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
