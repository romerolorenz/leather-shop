import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import {
  getProducts,
  groupProductsByCategory,
  formatPrice,
  type Product,
  type ShopSection,
} from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { UnavailableTag } from "@/components/UnavailableTag";
import { productAvailability } from "@/lib/availability";
import { ShopJumpNav } from "./ShopJumpNav";
import { CategoryRail } from "./CategoryRail";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Shop — Hiraya Leather",
  description:
    "Shop handcrafted leather goods, made in small batches — wallets, bags, and more.",
};

const HAIRLINE =
  "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

export default async function ProductsPage() {
  const sections = groupProductsByCategory(await getProducts());
  // A lone category heading under "Shop the Collection" reads as noise
  // (docs/design/shop-order.md), so with one category it's the plain grid,
  // with that category's description (if any) as an intro line.
  const showHeadings = sections.length > 1;
  const intro = !showHeadings ? sections[0]?.description : null;

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Shop the Collection
        </h1>
        {intro && (
          <p className={`-mt-4 mb-8 max-w-2xl text-[15px] leading-relaxed ${INK_SOFT}`}>
            {intro}
          </p>
        )}
        {showHeadings ? (
          <>
            <ShopJumpNav
              sections={sections.map((s) => ({ id: s.categoryId, name: s.name }))}
            />
            {sections.map((section, index) => (
              <CategorySection
                key={section.categoryId}
                section={section}
                first={index === 0}
              />
            ))}
          </>
        ) : (
          sections.map((section) => (
            <ProductGrid key={section.categoryId} products={section.products} />
          ))
        )}
      </div>
    </main>
  );
}

// Layout per docs/design/category-descriptions.md § Agreed layout:
//   phone (< 640px)    "Bold type": 28px heading, ink description, stacked
//                      over a 2-per-row grid; hairline above every
//                      category but the first (the sticky jump bar has one)
//   tablet (640–899px) stacked as on phones, desktop type, 3 per row
//   desktop (≥ 900px)  side rail: heading + description pinned in a 1/4
//                      column while the 3/4 grid scrolls past, until
//                      its top reaches the top of the last row's photos
//                      (CategoryRail measures that stop)
// The sticky rail and the scroll-margins read the offsets ShopJumpNav
// measures (--shop-header-offset, --shop-jump-height), so they clear the
// site header if it's sticky.
function CategorySection({
  section,
  first,
}: {
  section: ShopSection;
  first: boolean;
}) {
  const id = `category-${section.categoryId}`;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      aria-describedby={section.description ? `${id}-description` : undefined}
      className={`scroll-mt-[calc(var(--shop-header-offset,0px)+var(--shop-jump-height,0px)+16px)] sm:scroll-mt-[calc(var(--shop-header-offset,0px)+24px)] min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] min-[900px]:items-start min-[900px]:gap-x-10 ${HAIRLINE} ${
        first ? "sm:border-t sm:pt-8" : "mt-16 border-t pt-8 sm:mt-20"
      }`}
    >
      <CategoryRail>
        <h2
          id={`${id}-heading`}
          className="text-[28px] font-medium leading-tight tracking-[-0.025em] sm:text-[22px] sm:leading-snug sm:tracking-[-0.02em]"
        >
          {section.name}
        </h2>
        {section.description && (
          <p
            id={`${id}-description`}
            className="mt-2.5 text-[15px] leading-relaxed text-[#1C1A18] sm:mt-2 sm:text-[#6E6A64] dark:text-[#F3F1EC] sm:dark:text-[#A39C90]"
          >
            {section.description}
          </p>
        )}
      </CategoryRail>
      <ProductGrid products={section.products} rail />
    </section>
  );
}

function ProductGrid({
  products,
  rail = false,
}: {
  products: Product[];
  // Inside a category section: from 900px the grid is the 3/4 column
  // beside the side rail, with a tighter 24px gap.
  rail?: boolean;
}) {
  return (
    <ul
      data-rail-grid={rail || undefined}
      className={`grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 ${
        rail ? "min-[900px]:gap-6" : ""
      }`}
    >
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
                      sizes={
                        rail
                          ? "(min-width: 900px) 25vw, (min-width: 640px) 33vw, 50vw"
                          : "(min-width: 640px) 33vw, 50vw"
                      }
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
