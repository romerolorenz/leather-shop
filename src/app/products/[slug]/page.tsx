import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ProductDetail from "./ProductDetail";
import ProductGallery from "./ProductGallery";

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
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
    </main>
  );
}
