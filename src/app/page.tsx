import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { getProducts, formatPrice, type Product } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// `products` has no `featured` flag (gap flagged in
// docs/design/homepage.md §5.2) — hardcoded editorial picks for now
// rather than building admin tooling for a catalog this small.
const HERO_SLUGS = ["heritage-messenger-bag", "weekender-duffel"] as const;
const FEATURED_SLUGS = [
  "weekender-duffel",
  "card-wallet",
  "minimalist-cardholder",
] as const;

function pick(products: Product[], slugs: readonly string[]): Product[] {
  return slugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));
}

export default async function Home() {
  const products = await getProducts();
  const [heroA, heroB] = pick(products, HERO_SLUGS);
  const featured = pick(products, FEATURED_SLUGS);

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      {/* 1. Full-screen product highlight */}
      <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
        {heroA && (
          <Image
            src={heroA.photos[0]}
            alt=""
            fill
            priority
            sizes="100vw"
            className="homepage-hero-a object-cover"
          />
        )}
        {heroB && (
          <Image
            src={heroB.photos[0]}
            alt=""
            fill
            sizes="100vw"
            className="homepage-hero-b object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
          <div className="relative">
            {heroA && (
              <div className="homepage-hero-copy-a">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                  {heroA.name}
                </p>
                <p className="mt-2 max-w-md text-lg text-white sm:text-xl">
                  {heroA.description}
                </p>
              </div>
            )}
            {heroB && (
              <div className="homepage-hero-copy-b absolute inset-0">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                  {heroB.name}
                </p>
                <p className="mt-2 max-w-md text-lg text-white sm:text-xl">
                  {heroB.description}
                </p>
              </div>
            )}
          </div>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center text-xs font-medium uppercase tracking-[0.08em] text-white underline-offset-4 hover:underline sm:text-sm"
          >
            Shop the Collection&nbsp;→
          </Link>
        </div>
      </section>

      {/* 2. Top 3 products */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <ul className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {featured.map((product) => (
            <li key={product.slug}>
              <Reveal>
                <Link
                  href={`/products/${product.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={product.photos[0]}
                      alt={product.name}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.03]"
                    />
                  </div>
                  <h2 className="mt-4 font-semibold tracking-tight">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-[#6E6A64] dark:text-[#A39C90]">
                    {formatPrice(product.priceCentavos)}
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.08em] text-[#6E6A64] transition-colors group-hover:text-[#7A3B22] dark:text-[#A39C90] dark:group-hover:text-[#C97A4E]">
                    View
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Studio brief */}
      <section className="mx-auto max-w-3xl px-6 pb-24 sm:pb-32">
        <Reveal>
          <p className="max-w-[34rem] text-base leading-relaxed text-[#1C1A18]/90 dark:text-[#F3F1EC]/90">
            Every bag and wallet starts as a single hide, cut and
            hand-stitched in a small studio in Metro Manila. We work in small
            batches, not a production line, so each order gets real attention
            from start to finish.{" "}
            <Link
              href="/faq"
              className="text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
            >
              Read more in our FAQ
            </Link>
            .
          </p>
        </Reveal>
      </section>
    </main>
  );
}
