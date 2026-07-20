import { createPromoCodeAction } from "../../actions";
import { PromoCodeFormFields } from "../PromoCodeFormFields";
import { listCategories } from "@/lib/admin/categories";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function NewPromoCodePage() {
  const categories = await listCategories();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Promo codes", href: "/admin/promo-codes" },
          { label: "New promo code" },
        ]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        New promo code
      </h1>
      <ActionForm
        action={createPromoCodeAction}
        className="flex flex-col gap-4"
      >
        <PromoCodeFormFields categories={categories} />
        <SubmitButton
          pendingLabel="Creating…"
          className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Create promo code
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
