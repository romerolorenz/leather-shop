import { listProductsForAdmin } from "@/lib/admin/catalog";
import { listCategories } from "@/lib/admin/categories";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { ProductsCatalog } from "./ProductsCatalog";

const PRODUCTS_TABS = [
  { label: "Catalog", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Option Library", href: "/admin/options" },
];

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    listProductsForAdmin(),
    listCategories(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Products
      </h1>
      <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        The catalog, its categories, and shop-wide options.
      </p>
      <SectionTabs items={PRODUCTS_TABS} />

      <ProductsCatalog products={products} categories={categories} />
    </main>
  );
}
