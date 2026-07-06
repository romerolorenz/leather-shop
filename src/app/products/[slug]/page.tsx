import { notFound } from "next/navigation";
import { getProductBySlug, formatPrice } from "@/lib/products";

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-2 text-lg">{formatPrice(product.priceCentavos)}</p>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {product.description}
          </p>

          <div className="mt-6">
            <h2 className="text-sm font-medium">Color</h2>
            <div className="mt-2 flex gap-2">
              {product.variants.map((variant) => (
                <span
                  key={variant.label}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    variant.inStock
                      ? "border-black/[.15] dark:border-white/[.2]"
                      : "border-black/[.08] text-zinc-400 line-through dark:border-white/[.1]"
                  }`}
                >
                  {variant.label}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Lead time: ~{product.leadTimeDays} days
          </p>

          <button
            disabled={!product.orderingEnabled}
            className="mt-6 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {product.orderingEnabled ? "Add to cart" : "Currently unavailable"}
          </button>
        </div>
      </div>
    </main>
  );
}
