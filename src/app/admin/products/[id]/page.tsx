import { notFound } from "next/navigation";
import { getProductForAdmin } from "@/lib/admin/catalog";
import {
  updateProductAction,
  addVariantAction,
  updateVariantAction,
  deleteVariantAction,
  uploadPhotoAction,
} from "../../actions";
import { ProductFormFields } from "../ProductFormFields";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">
) {
  const { id } = await props.params;
  const product = await getProductForAdmin(id);

  if (!product) {
    notFound();
  }

  const updateAction = updateProductAction.bind(null, product.id);
  const uploadPhoto = uploadPhotoAction.bind(null, product.id);
  const addVariant = addVariantAction.bind(null, product.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {product.name}
      </h1>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Product photo</h2>
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photoUrl}
            alt={product.name}
            className="mb-4 h-48 w-48 rounded-lg object-cover"
          />
        ) : (
          <div className="mb-4 h-48 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        )}
        <form action={uploadPhoto} className="flex items-center gap-3">
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className="text-sm"
          />
          <button
            type="submit"
            className="rounded-full border border-black/[.15] px-4 py-2 text-sm dark:border-white/[.2]"
          >
            Upload
          </button>
        </form>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Product details</h2>
        <form action={updateAction} className="flex flex-col gap-4">
          <ProductFormFields
            defaultValues={{
              name: product.name,
              description: product.description,
              category: product.category,
              price: product.priceCentavos / 100,
              leadTimeDays: product.leadTimeDays,
              orderingEnabled: product.orderingEnabled,
            }}
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Save product
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium">Variants</h2>
        <ul className="mb-6 flex flex-col gap-3">
          {product.variants.map((variant) => {
            const updateVariant = updateVariantAction.bind(
              null,
              variant.id,
              product.id
            );
            const removeVariant = deleteVariantAction.bind(
              null,
              variant.id,
              product.id
            );
            return (
              <li key={variant.id} className="flex items-center gap-2">
                <form
                  action={updateVariant}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="label"
                    defaultValue={variant.label}
                    required
                    className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
                  />
                  <input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    defaultValue={variant.stockQuantity}
                    required
                    className="w-24 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
                  />
                  <button type="submit" className="text-sm underline">
                    Save
                  </button>
                </form>
                <form action={removeVariant}>
                  <button
                    type="submit"
                    className="text-sm text-red-600 underline"
                  >
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
          {product.variants.length === 0 && (
            <li className="text-sm text-zinc-500">No variants yet.</li>
          )}
        </ul>

        <form action={addVariant} className="flex items-center gap-2">
          <input
            name="label"
            placeholder="e.g. Black"
            required
            className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
          />
          <input
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={0}
            required
            className="w-24 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm dark:border-white/[.2]"
          >
            Add variant
          </button>
        </form>
      </section>
    </main>
  );
}
