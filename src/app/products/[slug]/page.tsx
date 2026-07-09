import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archivo } from "next/font/google";
import { getProductBySlug } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ProductDetail from "./ProductDetail";
import ProductGallery from "./ProductGallery";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(
  props: PageProps<"/products/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product || !product.visible) return {};

  return {
    title: `${product.name} — Leather Shop`,
    description:
      product.description ||
      `${product.name} — handcrafted leather goods, made in small batches.`,
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product || !product.visible) {
    notFound();
  }

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/products" },
            { label: product.name },
          ]}
        />
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <ProductGallery photos={product.photos} productName={product.name} />
          <ProductDetail product={product} />
        </div>
      </div>
    </main>
  );
}
