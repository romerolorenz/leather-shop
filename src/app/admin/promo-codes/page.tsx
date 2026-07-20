import { listPromoCodesForAdmin } from "@/lib/promo-codes";
import { listCategories } from "@/lib/admin/categories";
import { PromoCodesView } from "./PromoCodesView";

export default async function AdminPromoCodesPage() {
  const [promoCodes, categories] = await Promise.all([
    listPromoCodesForAdmin(),
    listCategories(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Promo Codes
      </h1>
      <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        Status is computed from the expiry date and the on/off switch
        together, not the switch alone.
      </p>

      <PromoCodesView promoCodes={promoCodes} categories={categories} />
    </main>
  );
}
