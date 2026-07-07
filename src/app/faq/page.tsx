import { getFaqItems } from "@/lib/faq";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = {
  title: "FAQ — Leather Shop",
};

export default async function FaqPage() {
  const items = await getFaqItems();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">FAQ</h1>

      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div key={item.id}>
            <h2 className="font-medium">{item.question}</h2>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {item.answer}
            </p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-zinc-500">
            No FAQ content yet — check back soon.
          </p>
        )}
      </div>
    </main>
  );
}
