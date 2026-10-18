import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import {
  getProducts,
  groupProductsByCategory,
  formatPrice,
  type Product,
} from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { UnavailableTag } from "@/components/UnavailableTag";
import { productAvailability } from "@/lib/availability";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Shop — Hiraya Leather",
  description:
    "Shop handcrafted leather goods, made in small batches — wallets, bags, and more.",
};

export default async function ProductsPage() {
  const sections = groupProductsByCategory(await getProducts());
  // A lone category heading under "Shop the Collection" reads as noise
  // (docs/design/shop-order.md), so with one category it's the plain grid.
  const showHeadings = sections.length > 1;

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Shop the Collection
        </h1>
        {sections.map((section, index) =>
          showHeadings ? (
            <section
              key={section.categoryId}
              aria-labelledby={`category-${section.categoryId}`}
              className={index > 0 ? "mt-16" : undefined}
            >
              <h2
                id={`category-${section.categoryId}`}
                className="mb-6 text-lg font-semibold tracking-tight"
              >
                {section.name}
              </h2>
              <ProductGrid products={section.products} />
            </section>
          ) : (
            <ProductGrid key={section.categoryId} products={section.products} />
          )
        )}
      </div>
    </main>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-4">
      {products.map((product) => {
        const availability = productAvailability(product);
        return (
          <li key={product.slug}>
            <Reveal>
              <Link href={`/products/${product.slug}`} className="group block">
                <div className="relative aspect-square w-full overflow-hidden bg-[#f3f1ec] dark:bg-[#1c1a18]">
                  {product.photos[0] ? (
                    <Image
                      src={product.photos[0]}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className={`object-cover ${
                        availability.unavailable
                          ? ""
                          : "transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.03]"
                      }`}
                    />
                  ) : null}
                  {availability.unavailable && (
                    <UnavailableTag label={availability.label} />
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="font-semibold tracking-tight">
                    {product.name}
                  </h3>
                  <span className="shrink-0 text-[#6E6A64] dark:text-[#A39C90]">
                    {formatPrice(product.priceCentavos)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                  {product.description}
                </p>
                <span
                  className={`mt-2 inline-block text-xs font-medium uppercase tracking-[0.08em] ${
                    availability.unavailable
                      ? "text-[#6E6A64] dark:text-[#A39C90]"
                      : "text-[#7A3B22] group-hover:underline dark:text-[#C97A4E]"
                  }`}
                >
                  {availability.caption}
                </span>
              </Link>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
