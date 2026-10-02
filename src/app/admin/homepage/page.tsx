import { listProductsForAdmin } from "@/lib/admin/catalog";
import { getSettings } from "@/lib/settings";
import {
  uploadHeroImageAction,
  updateHeroFocalPointAction,
  updateHomepageTextAction,
} from "../actions";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { HeroFocalPointPicker } from "@/components/admin/HeroFocalPointPicker";
import { HomepageFeatured } from "./HomepageFeatured";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";
const SECTION_HEADING = "text-xs font-semibold uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]";

const CONTENT_TABS = [
  { label: "Homepage", href: "/admin/homepage" },
  { label: "FAQ", href: "/admin/faq" },
];

const MAX_FEATURED = 3;

export default async function AdminHomepagePage() {
  const [products, settings] = await Promise.all([
    listProductsForAdmin(),
    getSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Content
      </h1>
      <p className={`mb-6 text-sm ${INK_SOFT}`}>
        Homepage and FAQ copy shown to customers.
      </p>
      <SectionTabs items={CONTENT_TABS} />

      {/* ─── Hero image ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <p className={`mb-2 ${SECTION_HEADING}`}>Hero image</p>
        <p className={`mb-4 text-sm ${INK_SOFT}`}>
          A standalone image for the full-screen homepage hero — not tied to
          any product&apos;s own photos.
        </p>

        <ActionForm
          action={uploadHeroImageAction}
          directUpload={{ field: "heroImage", target: { kind: "hero" } }}
          className="mb-6 flex items-center gap-2"
        >
          <input
            type="file"
            name="heroImage"
            accept="image/*"
            required
            aria-label="Hero image"
            className="flex-1 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background hover:file:bg-[#383838] active:file:opacity-70 dark:hover:file:bg-[#ccc]"
          />
          <SubmitButton
            pendingLabel="Uploading…"
            className={`whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-1.5 text-sm disabled:opacity-50`}
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
          <p className={`text-sm ${INK_SOFT}`}>
            No hero image set yet — upload one above. The homepage hero
            section won&apos;t render until this is set.
          </p>
        )}
      </section>

      {/* ─── Featured products ─────────────────────────────────────── */}
      <section className="mb-10">
        <p className={`mb-2 ${SECTION_HEADING}`}>Featured products</p>
        <p className={`mb-4 text-sm ${INK_SOFT}`}>
          {`Up to ${MAX_FEATURED} products shown in the homepage's featured grid (separate from the hero image above). Click a box to choose or change what's featured there, drag to reorder. A featured product that later gets paused or sells out stays in its slot and shows as unavailable, rather than being dropped.`}
        </p>

        <HomepageFeatured products={products} />
      </section>

      {/* ─── Homepage text ──────────────────────────────────────────── */}
      <section>
        <p className={`mb-4 ${SECTION_HEADING}`}>Homepage text</p>
        <ActionForm action={updateHomepageTextAction} className="flex flex-col">
          <div className="pb-6">
            <p className={`mb-3 ${SECTION_HEADING}`}>Hero</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="heroEyebrow">
                  Hero eyebrow
                </label>
                <input
                  id="heroEyebrow"
                  name="heroEyebrow"
                  required
                  defaultValue={settings.homepageHeroEyebrow}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="heroHeadline">
                  Hero headline
                </label>
                <textarea
                  id="heroHeadline"
                  name="heroHeadline"
                  rows={2}
                  required
                  defaultValue={settings.homepageHeroHeadline}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className={`border-t ${HAIRLINE} py-6`}>
            <p className={`mb-3 ${SECTION_HEADING}`}>Featured</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="featuredEyebrow">
                  Featured section eyebrow
                </label>
                <input
                  id="featuredEyebrow"
                  name="featuredEyebrow"
                  required
                  defaultValue={settings.homepageFeaturedEyebrow}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="featuredHeading">
                  Featured section heading
                </label>
                <input
                  id="featuredHeading"
                  name="featuredHeading"
                  required
                  defaultValue={settings.homepageFeaturedHeading}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className={`border-t ${HAIRLINE} py-6`}>
            <p className={`mb-3 ${SECTION_HEADING}`}>Studio</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioHeading">
                  Studio heading
                </label>
                <input
                  id="studioHeading"
                  name="studioHeading"
                  required
                  defaultValue={settings.homepageStudioHeading}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioBody">
                  Studio body
                </label>
                <textarea
                  id="studioBody"
                  name="studioBody"
                  rows={4}
                  required
                  defaultValue={settings.homepageStudioBody}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className={`flex justify-end border-t ${HAIRLINE} pt-6`}>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Save homepage text
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
