import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ProductDetail from "./ProductDetail";

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) {
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
        <div className="flex flex-col gap-3">
          {product.photos[0] ? (
            <Image
              src={product.photos[0]}
              alt={product.name}
              width={800}
              height={800}
              priority
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          )}
          {product.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.photos.slice(1).map((url) => (
                <Image
                  key={url}
                  src={url}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
        <ProductDetail product={product} />
      </div>
    </main>
  );
}
