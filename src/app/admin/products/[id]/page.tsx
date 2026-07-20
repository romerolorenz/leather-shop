import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductForAdmin, listOptionTypes } from "@/lib/admin/catalog";
import { listCategories } from "@/lib/admin/categories";
import { formatPrice } from "@/lib/products";
import { deleteProductAction } from "../../actions";
import { DeleteProductButton } from "../DeleteProductButton";
import { ProductEditTabs } from "./ProductEditTabs";

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">
) {
  const { id } = await props.params;
  const [product, optionTypes, categories] = await Promise.all([
    getProductForAdmin(id),
    listOptionTypes(),
    listCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const attachedTypeIds = new Set(product.options.map((o) => o.optionTypeId));
  const availableTypes = optionTypes.filter((t) => !attachedTypeIds.has(t.id));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-[.8125rem] text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC]"
      >
        <ChevronLeftIcon />
        Back to Products
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
            {product.category} · {formatPrice(product.priceCentavos)} ·{" "}
            {product.stockQuantity} in stock
          </p>
        </div>
        <DeleteProductButton action={deleteProductAction.bind(null, product.id)} />
      </div>

      <ProductEditTabs
        product={product}
        categories={categories}
        availableTypes={availableTypes}
      />
    </main>
  );
}
