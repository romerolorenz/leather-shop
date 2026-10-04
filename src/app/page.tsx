import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { getProducts, formatPrice } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { Reveal } from "@/components/Reveal";
import { UnavailableTag } from "@/components/UnavailableTag";
import { productAvailability } from "@/lib/availability";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Matches SiteHeader.tsx's nav container so the hero copy lines up with
// the "Leather Shop" wordmark above it.
const HERO_CONTAINER = "mx-auto max-w-6xl px-6 sm:px-10";

export default async function Home() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getSettings(),
  ]);

  // Admin-curated featured grid (US-38, up to 3, /admin/homepage) — the
  // hero image above is a separate, standalone settings-driven image with
  // no product association.
  const featured = products
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0));

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      {/* 1. Full-screen product highlight */}
      <section className="relative h-dvh overflow-hidden">
        {settings.heroImageUrl && (
          <Image
            src={settings.heroImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{
              objectPosition: `${settings.heroFocalX}% ${settings.heroFocalY}%`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div
          className={`absolute inset-x-0 bottom-0 pb-10 sm:pb-14 lg:pb-20 ${HERO_CONTAINER}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
            {settings.homepageHeroEyebrow}
          </p>
          <p className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
            {settings.homepageHeroHeadline}
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center rounded-full border border-white/70 px-6 py-3 text-xs font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-[#1C1A18] sm:text-sm"
          >
            Shop the Collection
          </Link>
        </div>
      </section>

      {/* 2. Top 3 products */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mb-12 sm:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#6E6A64] dark:text-[#A39C90]">
            {settings.homepageFeaturedEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {settings.homepageFeaturedHeading}
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {featured.map((product) => {
            const availability = productAvailability(product);
            return (
              <li key={product.slug}>
                <Reveal>
                  <Link
                    href={`/products/${product.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-[#f3f1ec] dark:bg-[#1c1a18]">
                      {product.photos[0] ? (
                        <Image
                          src={product.photos[0]}
                          alt={product.name}
                          fill
                          sizes="(min-width: 640px) 33vw, 100vw"
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
      </section>

      {/* Thin hairline between the featured grid and the studio brief */}
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="border-t border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]" />
      </div>

      {/* 3. Studio brief */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pb-32">
        <Reveal>
          <div className="mx-auto max-w-[34rem]">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {settings.homepageStudioHeading}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#1C1A18]/90 dark:text-[#F3F1EC]/90">
              {settings.homepageStudioBody}
            </p>
            <Link
              href="/faq"
              className="mt-4 inline-block text-sm font-medium uppercase tracking-[0.08em] text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
            >
              Learn more
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
