import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { getProducts, formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Shop — Leather Shop",
  description:
    "Shop handcrafted leather goods, made in small batches — wallets, bags, and more.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Shop the Collection
        </h1>
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-4">
          {products.map((product) => {
            const unavailable = !product.orderingEnabled || !product.inStock;
            return (
              <li key={product.slug}>
                <Reveal>
                  <Link href={`/products/${product.slug}`} className="group block">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f3f1ec] dark:bg-[#1c1a18]">
                      {product.photos[0] ? (
                        <Image
                          src={product.photos[0]}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className={`object-cover transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.03] ${
                            unavailable ? "opacity-60 grayscale-[0.4]" : ""
                          }`}
                        />
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-4">
                      <h2 className="font-semibold tracking-tight">
                        {product.name}
                      </h2>
                      <span
                        className={`shrink-0 text-[#6E6A64] dark:text-[#A39C90] ${
                          unavailable ? "line-through" : ""
                        }`}
                      >
                        {formatPrice(product.priceCentavos)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                      {product.description}
                    </p>
                    <span
                      className={`mt-2 inline-block text-xs font-medium uppercase tracking-[0.08em] ${
                        unavailable
                          ? "text-[#6E6A64] dark:text-[#A39C90]"
                          : "text-[#7A3B22] group-hover:underline dark:text-[#C97A4E]"
                      }`}
                    >
                      {!product.orderingEnabled
                        ? "Currently unavailable"
                        : !product.inStock
                          ? "Sold out"
                          : "View"}
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
