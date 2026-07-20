import { notFound } from "next/navigation";
import { getPromoCodeForAdmin } from "@/lib/promo-codes";
import { listCategories } from "@/lib/admin/categories";
import { updatePromoCodeAction, deletePromoCodeAction } from "../../actions";
import { PromoCodeFormFields } from "../PromoCodeFormFields";
import { DeletePromoCodeButton } from "../DeletePromoCodeButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

// ISO timestamp -> the date-only string <input type="date"> expects.
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export default async function EditPromoCodePage(
  props: PageProps<"/admin/promo-codes/[id]">
) {
  const { id } = await props.params;
  const [promo, categories] = await Promise.all([
    getPromoCodeForAdmin(id),
    listCategories(),
  ]);

  if (!promo) {
    notFound();
  }

  const updateAction = updatePromoCodeAction.bind(null, promo.id);
  const removeAction = deletePromoCodeAction.bind(null, promo.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Promo codes", href: "/admin/promo-codes" },
          { label: promo.code },
        ]}
      />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {promo.code}
        </h1>
        <DeletePromoCodeButton action={removeAction} />
      </div>

      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Redeemed {promo.redeemedCount}/{promo.usageLimitTotal} times.
      </p>

      <ActionForm action={updateAction} className="flex flex-col gap-4">
        <PromoCodeFormFields
          categories={categories}
          defaultValues={{
            code: promo.code,
            discountPercent: promo.discountPercent,
            maxDiscountAmount: promo.maxDiscountCentavos / 100,
            minOrderValue: promo.minOrderValueCentavos / 100,
            usageLimitTotal: promo.usageLimitTotal,
            startsAt: toDateInputValue(promo.startsAt),
            expiresAt: toDateInputValue(promo.expiresAt),
            active: promo.active,
            categoryIds: promo.categoryIds,
            limitOnePerCustomer: promo.limitOnePerCustomer,
          }}
        />
        <SubmitButton
          pendingLabel="Saving…"
          className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Save promo code
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
