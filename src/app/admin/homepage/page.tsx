import Image from "next/image";
import { listProductsForAdmin } from "@/lib/admin/catalog";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/products";
import {
  setProductFeaturedAction,
  reorderFeaturedProductsAction,
  uploadHeroImageAction,
  updateHeroFocalPointAction,
  updateHomepageTextAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { HeroFocalPointPicker } from "@/components/admin/HeroFocalPointPicker";
import { DragReorderList } from "@/components/admin/DragReorderList";

const MAX_FEATURED = 3;

const SLOT_LABELS = ["Grid position 1", "Grid position 2", "Grid position 3"];

export default async function AdminHomepagePage() {
  const [products, settings] = await Promise.all([
    listProductsForAdmin(),
    getSettings(),
  ]);

  const featured = products
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0));
  const atMax = featured.length >= MAX_FEATURED;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Homepage" }]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Homepage</h1>

      {/* ─── Featured products ─────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-medium">Featured products</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Up to {MAX_FEATURED} products shown in the homepage&apos;s featured
          grid (separate from the hero image below). A featured product
          that later gets paused or sells out stays in its slot and shows
          as unavailable, rather than being dropped.
        </p>

        {featured.length > 0 && (
          <DragReorderList
            items={featured}
            onReorder={reorderFeaturedProductsAction}
            className="mb-6 flex flex-col gap-2"
            itemClassName="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            {featured.map((product, index) => (
              <div key={product.id}>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {SLOT_LABELS[index] ?? `Grid position ${index}`}
                </p>
                <p className="text-sm font-medium">{product.name}</p>
              </div>
            ))}
          </DragReorderList>
        )}

        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const photo = product.photos[0];
            const toggleFeatured = setProductFeaturedAction.bind(
              null,
              product.id,
              !product.featured
            );
            const disableFeature = !product.featured && atMax;
            return (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
              >
                <div className="flex items-center gap-3">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 flex-none rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 flex-none rounded-md bg-zinc-100 dark:bg-zinc-900" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {product.category} · {formatPrice(product.priceCentavos)}
                    </p>
                  </div>
                </div>
                <ActionButton
                  action={toggleFeatured}
                  disabled={disableFeature}
                  ariaLabel={
                    product.featured
                      ? "Unfeature product"
                      : disableFeature
                        ? "Unfeature one to add another"
                        : "Feature product"
                  }
                  className="whitespace-nowrap rounded-full border border-black/[.15] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[.2]"
                >
                  {product.featured ? "Featured ✓ — Unfeature" : "Feature"}
                </ActionButton>
              </li>
            );
          })}
          {products.length === 0 && (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">
              No products yet.
            </li>
          )}
        </ul>
      </section>

      {/* ─── Hero image ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-medium">Hero image</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          A standalone image for the full-screen homepage hero — not tied to
          any product&apos;s own photos.
        </p>

        <ActionForm
          action={uploadHeroImageAction}
          className="mb-6 flex items-center gap-2"
        >
          <input
            type="file"
            name="heroImage"
            accept="image/*"
            required
            aria-label="Hero image"
            className="flex-1 text-sm"
          />
          <SubmitButton
            pendingLabel="Uploading…"
            className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
          >
            Upload
          </SubmitButton>
        </ActionForm>

        {settings.heroImageUrl ? (
          <HeroFocalPointPicker
            imageUrl={settings.heroImageUrl}
            initialFocalX={settings.heroFocalX}
            initialFocalY={settings.heroFocalY}
            saveFocalPointAction={updateHeroFocalPointAction}
          />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hero image set yet — upload one above. The homepage hero
            section won&apos;t render until this is set.
          </p>
        )}
      </section>

      {/* ─── Homepage text ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-medium">Homepage text</h2>
        <ActionForm
          action={updateHomepageTextAction}
          className="flex flex-col gap-6"
        >
          <div>
            <label className="text-sm font-medium" htmlFor="heroEyebrow">
              Hero eyebrow
            </label>
            <input
              id="heroEyebrow"
              name="heroEyebrow"
              required
              defaultValue={settings.homepageHeroEyebrow}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="heroHeadline">
              Hero headline
            </label>
            <textarea
              id="heroHeadline"
              name="heroHeadline"
              rows={2}
              required
              defaultValue={settings.homepageHeroHeadline}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="featuredEyebrow">
              Featured section eyebrow
            </label>
            <input
              id="featuredEyebrow"
              name="featuredEyebrow"
              required
              defaultValue={settings.homepageFeaturedEyebrow}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="featuredHeading">
              Featured section heading
            </label>
            <input
              id="featuredHeading"
              name="featuredHeading"
              required
              defaultValue={settings.homepageFeaturedHeading}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="studioHeading">
              Studio heading
            </label>
            <input
              id="studioHeading"
              name="studioHeading"
              required
              defaultValue={settings.homepageStudioHeading}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="studioBody">
              Studio body
            </label>
            <textarea
              id="studioBody"
              name="studioBody"
              rows={4}
              required
              defaultValue={settings.homepageStudioBody}
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          <SubmitButton
            pendingLabel="Saving…"
            className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Save homepage text
          </SubmitButton>
        </ActionForm>
      </section>
    </main>
  );
}
