import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductForAdmin } from "@/lib/admin/catalog";
import {
  updateProductAction,
  addVariantAction,
  updateAllVariantsAction,
  deleteVariantAction,
  uploadPhotoAction,
  deletePhotoAction,
} from "../../actions";
import { ProductFormFields } from "../ProductFormFields";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

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
  const variantIds = product.variants.map((variant) => variant.id);
  const updateAllVariants = updateAllVariantsAction.bind(
    null,
    product.id,
    variantIds
  );

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
        <h2 className="mb-4 text-sm font-medium">Product photos</h2>
        {product.photos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {product.photos.map((photo) => {
              const removePhoto = deletePhotoAction.bind(
                null,
                photo.id,
                product.id,
                photo.url
              );
              return (
                <div key={photo.id} className="relative">
                  <Image
                    src={photo.url}
                    alt={product.name}
                    width={200}
                    height={200}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <form action={removePhoto} className="absolute top-1.5 right-1.5">
                    <button
                      type="submit"
                      aria-label="Delete photo"
                      className="rounded-md bg-background/80 p-1.5 text-red-600 backdrop-blur-sm transition-transform hover:bg-red-600/10 active:scale-95"
                    >
                      <TrashIcon />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
        {product.photos.length === 0 && (
          <div className="mb-4 h-48 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        )}
        <form action={uploadPhoto} className="flex items-center gap-3">
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            required
            className="text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background hover:file:bg-[#383838] active:file:opacity-70 dark:hover:file:bg-[#ccc]"
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
        {product.variants.length > 0 && (
          <form action={updateAllVariants} className="mb-6">
            <ul className="mb-4 flex flex-col gap-3">
              {product.variants.map((variant) => {
                const removeVariant = deleteVariantAction.bind(
                  null,
                  variant.id,
                  product.id
                );
                return (
                  <li key={variant.id} className="flex items-center gap-2">
                    <input
                      name={`label:${variant.id}`}
                      defaultValue={variant.label}
                      required
                      className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
                    />
                    <input
                      name={`stock:${variant.id}`}
                      type="number"
                      min="0"
                      defaultValue={variant.stockQuantity}
                      required
                      className="w-24 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
                    />
                    <button
                      type="submit"
                      formAction={removeVariant}
                      aria-label="Delete variant"
                      className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="submit"
              className="rounded-full border border-black/[.15] px-4 py-2 text-sm dark:border-white/[.2]"
            >
              Save all variants
            </button>
          </form>
        )}
        {product.variants.length === 0 && (
          <p className="mb-6 text-sm text-zinc-500">No variants yet.</p>
        )}

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
