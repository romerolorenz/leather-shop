export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Placeholder page. Per PRD: manage products/variants/photos/stock,
        toggle ordering per product, manage incoming orders. Access is now
        gated to the admin allow-list (Phase 4) — the actual product/order
        management UI is still Phase 5.
      </p>
    </main>
  );
}
