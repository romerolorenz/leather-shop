"use client";

import Image from "next/image";
import Link from "next/link";
import type { AdminProduct, OptionType } from "@/lib/admin/catalog";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DragReorderList } from "@/components/admin/DragReorderList";
import { ProductFormFields } from "../ProductFormFields";
import {
  updateProductAction,
  uploadPhotoAction,
  deletePhotoAction,
  reorderProductPhotosAction,
  attachOptionAction,
  detachOptionAction,
  updateProductOptionSelectionsAction,
  reorderProductOptionsAction,
} from "../../actions";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

export function ProductEditTabs({
  product,
  categories,
  availableTypes,
}: {
  product: AdminProduct;
  categories: { id: string; name: string }[];
  availableTypes: OptionType[];
}) {
  const updateAction = updateProductAction.bind(null, product.id);
  const uploadPhoto = uploadPhotoAction.bind(null, product.id);
  const reorderPhotos = reorderProductPhotosAction.bind(null, product.id);
  const attachOption = attachOptionAction.bind(null, product.id);
  const productOptionIds = product.options.map((o) => o.productOptionId);
  const saveAllSelections = updateProductOptionSelectionsAction.bind(
    null,
    product.id,
    productOptionIds
  );
  const reorderOptions = reorderProductOptionsAction.bind(null, product.id);

  return (
    <StatusTabs
      tabs={[
        { key: "details", label: "Details" },
        { key: "photos", label: "Photos" },
        { key: "options", label: "Options" },
      ]}
      defaultTab="details"
    >
      {(active) => (
        <>
          {active === "details" && (
            <ActionForm action={updateAction} className="flex flex-col gap-4">
              <ProductFormFields
                categories={categories}
                defaultValues={{
                  name: product.name,
                  description: product.description,
                  categoryId: product.categoryId,
                  price: product.priceCentavos / 100,
                  leadTimeDays: product.leadTimeDays,
                  orderingEnabled: product.orderingEnabled,
                  visible: product.visible,
                  stockQuantity: product.stockQuantity,
                  dimensions: product.dimensions,
                  details: product.details,
                }}
              />
              <div className={`mt-2 flex justify-end border-t ${HAIRLINE} pt-4`}>
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  Save changes
                </SubmitButton>
              </div>
            </ActionForm>
          )}

          {active === "photos" && (
            <div>
              {product.photos.length > 0 ? (
                <DragReorderList
                  items={product.photos}
                  onReorder={reorderPhotos}
                  className="flex flex-wrap gap-3"
                  itemClassName="w-[150px]"
                >
                  {product.photos.map((photo) => (
                    <div key={photo.id} className="relative w-[110px]">
                      <Image
                        src={photo.url}
                        alt={product.name}
                        width={110}
                        height={110}
                        className="aspect-square w-[110px] rounded-lg object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5">
                        <ActionButton
                          action={deletePhotoAction.bind(null, photo.id, product.id, photo.url)}
                          confirmMessage="Delete this photo?"
                          ariaLabel="Delete photo"
                          className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur-sm transition-transform hover:bg-black/70 active:scale-95 disabled:opacity-50"
                        >
                          <TrashIcon />
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </DragReorderList>
              ) : (
                <div className="h-[110px] w-[110px] rounded-lg bg-black/[.05] dark:bg-white/[.08]" />
              )}
              <p className="mt-3 text-xs text-[#6E6A64] dark:text-[#A39C90]">
                Drag the grip handle to reorder — the first photo is the one
                shown on the shop grid.
              </p>

              <ActionForm
                action={uploadPhoto}
                directUpload={{
                  field: "photos",
                  target: { kind: "product", productId: product.id },
                }}
                className="mt-4 flex items-center gap-3"
              >
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
                  className={`whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-2 text-sm disabled:opacity-50`}
                >
                  Upload
                </SubmitButton>
              </ActionForm>
            </div>
          )}

          {active === "options" && (
            <div>
              <p className="mb-4 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                Attach a shared option (defined once on the option library
                page) and pick which of its values this product offers. Any
                combination of a product&apos;s own option values is
                orderable — no separate variant step. The order below is the
                order option types are shown in on the product page.
              </p>

              {product.options.length > 0 ? (
                <ActionForm action={saveAllSelections} className="mb-6">
                  <DragReorderList
                    items={product.options.map((o) => ({ ...o, id: o.productOptionId }))}
                    onReorder={reorderOptions}
                    className="mb-4 flex flex-col gap-3"
                    itemClassName={`rounded-lg border ${HAIRLINE} p-4`}
                  >
                    {product.options.map((option) => (
                      <div key={option.productOptionId}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
                            {option.name}{" "}
                            <span className="text-xs font-normal text-[#6E6A64] dark:text-[#A39C90]">
                              ({option.displayStyle})
                            </span>
                          </span>
                          <ActionButton
                            action={detachOptionAction.bind(null, option.productOptionId, product.id)}
                            confirmMessage="Detach this option from the product? Other products using it are unaffected."
                            ariaLabel="Detach option"
                            className="rounded-md p-1.5 text-[#8C3B32] transition-transform hover:bg-[rgba(140,59,50,.1)] active:scale-95 disabled:opacity-50 dark:text-[#E08A78]"
                          >
                            <TrashIcon />
                          </ActionButton>
                        </div>

                        {option.allValues.length === 0 ? (
                          <p className="mt-2 pl-4 text-xs text-[#6E6A64] dark:text-[#A39C90]">
                            This option has no values yet — add some on the
                            option library page.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-col gap-2 pl-4">
                            {option.allValues.map((value) => (
                              <label
                                key={value.id}
                                className="flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]"
                              >
                                <input
                                  type="checkbox"
                                  name={`valueIds:${option.productOptionId}`}
                                  value={value.id}
                                  defaultChecked={option.selectedValueIds.includes(value.id)}
                                />
                                {value.value}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </DragReorderList>
                  <SubmitButton
                    pendingLabel="Saving…"
                    className={`whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-1.5 text-sm disabled:opacity-50`}
                  >
                    Save options
                  </SubmitButton>
                </ActionForm>
              ) : (
                <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                  No options attached yet.
                </p>
              )}

              {availableTypes.length > 0 ? (
                <ActionForm action={attachOption} className="flex items-center gap-2">
                  <select
                    name="optionTypeId"
                    required
                    defaultValue=""
                    aria-label="Option to attach"
                    className={`${FIELD_CLASS} w-auto min-w-[10rem]`}
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
                    className={`whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-1.5 text-sm disabled:opacity-50`}
                  >
                    Attach
                  </SubmitButton>
                </ActionForm>
              ) : (
                <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
                  Every option type is already attached. New option types are
                  created from{" "}
                  <Link
                    href="/admin/options"
                    className="text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
                  >
                    Products / Option Library
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
        </>
      )}
    </StatusTabs>
  );
}
