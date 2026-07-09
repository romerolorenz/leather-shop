import { Archivo } from "next/font/google";
import { getFaqItems } from "@/lib/faq";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "FAQ — Leather Shop",
};

export default async function FaqPage() {
  const items = await getFaqItems();

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          FAQ
        </h1>

        <div className="flex flex-col divide-y divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]">
          {items.map((item) => (
            <div key={item.id} className="py-6 first:pt-0">
              <h2 className="font-semibold tracking-tight">
                {item.question}
              </h2>
              <p className="mt-1 text-[#6E6A64] dark:text-[#A39C90]">
                {item.answer}
              </p>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-6 text-sm text-[#6E6A64] first:pt-0 dark:text-[#A39C90]">
              No FAQ content yet — check back soon.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
