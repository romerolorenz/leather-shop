import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductForAdmin, listOptionTypes } from "@/lib/admin/catalog";
import {
  updateProductAction,
  attachOptionAction,
  createOptionTypeAndAttachAction,
  updateProductOptionSelectionAction,
  detachOptionAction,
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

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">
) {
  const { id } = await props.params;
  const [product, optionTypes] = await Promise.all([
    getProductForAdmin(id),
    listOptionTypes(),
  ]);

  if (!product) {
    notFound();
  }

  const updateAction = updateProductAction.bind(null, product.id);
  const uploadPhoto = uploadPhotoAction.bind(null, product.id);
  const attachOption = attachOptionAction.bind(null, product.id);
  const createAndAttach = createOptionTypeAndAttachAction.bind(null, product.id);
  const attachedTypeIds = new Set(product.options.map((o) => o.optionTypeId));
  const availableTypes = optionTypes.filter((t) => !attachedTypeIds.has(t.id));

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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium">Options</h2>
          <Link href="/admin/options" className="text-sm underline">
            Manage option library
          </Link>
        </div>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Attach a shared option (defined once on the option library page)
          and pick which of its values this product offers. Any combination
          of a product&apos;s own option values is orderable — no separate
          variant step.
        </p>

        <ul className="mb-6 flex flex-col gap-4">
          {product.options.map((option) => {
            const updateSelection = updateProductOptionSelectionAction.bind(
              null,
              option.productOptionId,
              product.id
            );
            const detach = detachOptionAction.bind(
              null,
              option.productOptionId,
              product.id
            );
            return (
              <li
                key={option.productOptionId}
                className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {option.name}{" "}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      ({option.displayStyle})
                    </span>
                  </span>
                  <ActionButton
                    action={detach}
                    confirmMessage="Detach this option from the product? Other products using it are unaffected."
                    ariaLabel="Detach option"
                    className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </ActionButton>
                </div>

                {option.allValues.length === 0 ? (
                  <p className="mt-2 pl-4 text-xs text-zinc-500 dark:text-zinc-400">
                    This option has no values yet — add some on the option
                    library page.
                  </p>
                ) : (
                  <ActionForm
                    action={updateSelection}
                    className="mt-2 flex flex-col gap-2 pl-4"
                  >
                    {option.allValues.map((value) => (
                      <label
                        key={value.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="valueIds"
                          value={value.id}
                          defaultChecked={option.selectedValueIds.includes(
                            value.id
                          )}
                        />
                        {value.value}
                      </label>
                    ))}
                    <SubmitButton
                      pendingLabel="Saving…"
                      className="mt-1 self-start whitespace-nowrap rounded-full border border-black/[.15] px-3 py-1 text-xs disabled:opacity-50 dark:border-white/[.2]"
                    >
                      Save selection
                    </SubmitButton>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
        {product.options.length === 0 && (
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            No options attached yet.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {availableTypes.length > 0 && (
            <ActionForm
              action={attachOption}
              className="flex items-center gap-2"
            >
              <select
                name="optionTypeId"
                required
                defaultValue=""
                aria-label="Option to attach"
                className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
              >
                <option value="" disabled>
                  Attach existing option…
                </option>
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <SubmitButton
                pendingLabel="Attaching…"
                className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
              >
                Attach
              </SubmitButton>
            </ActionForm>
          )}

          <ActionForm
            action={createAndAttach}
            className="flex items-center gap-2"
          >
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
              pendingLabel="Creating…"
              className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
            >
              Create &amp; attach new
            </SubmitButton>
          </ActionForm>
        </div>
      </section>
    </main>
  );
}
