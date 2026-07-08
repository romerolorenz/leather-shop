import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductForAdmin } from "@/lib/admin/catalog";
import {
  updateProductAction,
  createOptionTypeAction,
  updateOptionTypeAction,
  deleteOptionTypeAction,
  createOptionValueAction,
  updateOptionValueAction,
  deleteOptionValueAction,
  createVariantAction,
  deleteVariantAction,
  uploadPhotoAction,
  deletePhotoAction,
} from "../../actions";
import { ProductFormFields } from "../ProductFormFields";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/admin/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

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

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
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
  const addOptionType = createOptionTypeAction.bind(null, product.id);
  const optionTypeIds = product.optionTypes.map((type) => type.id);
  const addVariant = createVariantAction.bind(null, product.id, optionTypeIds);

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
                  <div className="absolute top-1.5 right-1.5">
                    <ActionButton
                      action={removePhoto}
                      confirmMessage="Delete this photo?"
                      ariaLabel="Delete photo"
                      className="rounded-md bg-background/80 p-1.5 text-red-600 backdrop-blur-sm transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                    >
                      <TrashIcon />
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {product.photos.length === 0 && (
          <div className="mb-4 h-48 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        )}
        <ActionForm action={uploadPhoto} className="flex items-center gap-3">
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            required
            className="text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background hover:file:bg-[#383838] active:file:opacity-70 dark:hover:file:bg-[#ccc]"
          />
          <SubmitButton
            pendingLabel="Uploading…"
            className="rounded-full border border-black/[.15] px-4 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
          >
            Upload
          </SubmitButton>
        </ActionForm>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Product details</h2>
        <ActionForm action={updateAction} className="flex flex-col gap-4">
          <ProductFormFields
            defaultValues={{
              name: product.name,
              description: product.description,
              category: product.category,
              price: product.priceCentavos / 100,
              leadTimeDays: product.leadTimeDays,
              orderingEnabled: product.orderingEnabled,
              stockQuantity: product.stockQuantity,
            }}
          />
          <SubmitButton
            pendingLabel="Saving…"
            className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Save product
          </SubmitButton>
        </ActionForm>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Options</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Define the choices shoppers pick from (e.g. Color, Thread Color,
          Size) before creating variants below.
        </p>
        <ul className="mb-6 flex flex-col gap-4">
          {product.optionTypes.map((type) => {
            const updateType = updateOptionTypeAction.bind(
              null,
              type.id,
              product.id
            );
            const removeType = deleteOptionTypeAction.bind(
              null,
              type.id,
              product.id
            );
            const addValue = createOptionValueAction.bind(
              null,
              type.id,
              product.id
            );
            return (
              <li
                key={type.id}
                className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <div className="flex items-center gap-2">
                  <ActionForm
                    action={updateType}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input
                      name="name"
                      defaultValue={type.name}
                      aria-label="Option type name"
                      required
                      className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm font-medium dark:border-white/[.2]"
                    />
                    <select
                      name="displayStyle"
                      defaultValue={type.displayStyle}
                      aria-label="Display style"
                      className="rounded-md border border-black/[.15] bg-transparent px-2 py-1.5 text-sm dark:border-white/[.2]"
                    >
                      <option value="buttons">Buttons</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                    <SubmitButton
                      ariaLabel="Save option type"
                      className="rounded-md p-1.5 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
                    >
                      <SaveIcon />
                    </SubmitButton>
                  </ActionForm>
                  <ActionButton
                    action={removeType}
                    confirmMessage="Delete this option type? This removes it from any variants using it."
                    ariaLabel="Delete option type"
                    className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </ActionButton>
                </div>

                <ul className="mt-3 flex flex-col gap-2 pl-4">
                  {type.values.map((value) => {
                    const updateValue = updateOptionValueAction.bind(
                      null,
                      value.id,
                      product.id
                    );
                    const removeValue = deleteOptionValueAction.bind(
                      null,
                      value.id,
                      product.id
                    );
                    return (
                      <li key={value.id} className="flex items-center gap-2">
                        <ActionForm
                          action={updateValue}
                          className="flex flex-1 items-center gap-2"
                        >
                          <input
                            name="value"
                            defaultValue={value.value}
                            aria-label="Option value"
                            required
                            className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1 text-sm dark:border-white/[.2]"
                          />
                          <SubmitButton
                            ariaLabel="Save value"
                            className="rounded-md p-1 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
                          >
                            <SaveIcon />
                          </SubmitButton>
                        </ActionForm>
                        <ActionButton
                          action={removeValue}
                          confirmMessage="Delete this value?"
                          ariaLabel="Delete value"
                          className="rounded-md p-1 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                        >
                          <TrashIcon />
                        </ActionButton>
                      </li>
                    );
                  })}
                </ul>
                <ActionForm
                  action={addValue}
                  className="mt-2 flex items-center gap-2 pl-4"
                >
                  <input
                    name="value"
                    placeholder="e.g. Natural Thread"
                    required
                    className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1 text-sm dark:border-white/[.2]"
                  />
                  <SubmitButton
                    pendingLabel="Adding…"
                    className="whitespace-nowrap rounded-full border border-black/[.15] px-3 py-1 text-xs disabled:opacity-50 dark:border-white/[.2]"
                  >
                    Add value
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
        {product.optionTypes.length === 0 && (
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            No option types yet.
          </p>
        )}

        <ActionForm action={addOptionType} className="flex items-center gap-2">
          <input
            name="name"
            placeholder="e.g. Thread Color"
            required
            className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
          />
          <select
            name="displayStyle"
            defaultValue="buttons"
            aria-label="Display style"
            className="rounded-md border border-black/[.15] bg-transparent px-2 py-1.5 text-sm dark:border-white/[.2]"
          >
            <option value="buttons">Buttons</option>
            <option value="dropdown">Dropdown</option>
          </select>
          <SubmitButton
            pendingLabel="Adding…"
            className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
          >
            Add option type
          </SubmitButton>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium">Variants</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Each variant is one purchasable combination of option values.
          Stock is set once for the whole product above, not per variant
          — a variant&apos;s combination can&apos;t be edited after
          creation; delete and re-add it instead.
        </p>
        {product.variants.length > 0 && (
          <ul className="mb-6 flex flex-col gap-2">
            {product.variants.map((variant) => {
              const removeVariant = deleteVariantAction.bind(
                null,
                variant.id,
                product.id
              );
              return (
                <li
                  key={variant.id}
                  className="flex items-center gap-2 rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145]"
                >
                  <span className="flex-1 text-sm">{variant.label}</span>
                  <ActionButton
                    action={removeVariant}
                    confirmMessage="Delete this variant?"
                    ariaLabel="Delete variant"
                    className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        )}
        {product.variants.length === 0 && (
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">No variants yet.</p>
        )}

        {product.optionTypes.length > 0 ? (
          <ActionForm
            action={addVariant}
            className="flex flex-wrap items-center gap-2"
          >
            {product.optionTypes.map((type) => (
              <select
                key={type.id}
                name={`optionValue:${type.id}`}
                required
                defaultValue=""
                aria-label={type.name}
                className="rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
              >
                <option value="" disabled>
                  {type.name}
                </option>
                {type.values.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.value}
                  </option>
                ))}
              </select>
            ))}
            <SubmitButton
              pendingLabel="Adding…"
              className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
            >
              Add variant
            </SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Add at least one option type above before creating variants.
          </p>
        )}
      </section>
    </main>
  );
}
