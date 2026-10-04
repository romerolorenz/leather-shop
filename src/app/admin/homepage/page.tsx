import { listProductsForAdmin } from "@/lib/admin/catalog";
import { getSettings } from "@/lib/settings";
import {
  uploadHeroImageAction,
  updateHeroFocalPointAction,
  updateHomepageTextAction,
  uploadStudioImageAction,
  updateStudioFocalPointAction,
  removeStudioImageAction,
  uploadStudioPortraitAction,
  removeStudioPortraitAction,
} from "../actions";
import { ActionButton } from "@/components/ActionButton";
import { CharCountTextarea } from "@/components/admin/CharCountTextarea";
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

// Hardcoded exception (CLAUDE.md "settings are configurable"): a soft
// editorial guideline for the counter only (docs/design/studio-profile.md
// §6), never enforced — not a business value the owner would tune.
const STUDIO_QUOTE_SOFT_LIMIT = 140;

const FILE_INPUT_CLASS =
  "flex-1 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background hover:file:bg-[#383838] active:file:opacity-70 dark:hover:file:bg-[#ccc]";
const PILL_BUTTON_CLASS = `whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-1.5 text-sm disabled:opacity-50`;
const REMOVE_BUTTON_CLASS = `whitespace-nowrap rounded-full border ${HAIRLINE} px-4 py-1.5 text-sm text-[#8C3B32] transition-colors hover:bg-[rgba(140,59,50,.08)] disabled:opacity-50 dark:text-[#E08A78]`;

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
          {`Up to ${MAX_FEATURED} products shown in the homepage's featured grid (separate from the hero image above). Click a box to choose or change what's featured there, drag to reorder. A featured product that later gets paused or sells out stays in its slot and shows as unavailable, rather than being dropped. A hidden product's slot is skipped on the homepage until it's visible again.`}
        </p>

        <HomepageFeatured products={products} />
      </section>

      {/* ─── Studio photo & maker ──────────────────────────────────── */}
      {/* docs/design/studio-profile.md (Variant 3, flexible) */}
      <section className="mb-10">
        <p className={`mb-2 ${SECTION_HEADING}`}>Studio photo &amp; maker</p>
        <p className={`mb-6 text-sm ${INK_SOFT}`}>
          A photo and an optional small portrait for the homepage&apos;s
          Studio section. The quote, your name and role are in Homepage
          text below.
        </p>

        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className={`mb-1 ${LABEL_CLASS}`}>Studio photo</p>
            <p className={`mb-3 text-sm ${INK_SOFT}`}>
              With a portrait: use a close-up of your hands at work. Without
              one: use a photo of you at the bench.
            </p>
            <ActionForm
              action={uploadStudioImageAction}
              directUpload={{ field: "studioImage", target: { kind: "studio" } }}
              className="mb-6 flex items-center gap-2"
            >
              <input
                type="file"
                name="studioImage"
                accept="image/*"
                required
                aria-label="Studio photo"
                className={FILE_INPUT_CLASS}
              />
              <SubmitButton
                pendingLabel="Uploading…"
                className={PILL_BUTTON_CLASS}
              >
                Upload
              </SubmitButton>
            </ActionForm>

            {settings.homepageStudioImageUrl ? (
              <>
                <HeroFocalPointPicker
                  // Remount on a new upload so the marker picks up the
                  // reset 50/50 focal point instead of the old one.
                  key={settings.homepageStudioImageUrl}
                  imageUrl={settings.homepageStudioImageUrl}
                  initialFocalX={settings.homepageStudioFocalX}
                  initialFocalY={settings.homepageStudioFocalY}
                  saveFocalPointAction={updateStudioFocalPointAction}
                  previews={[
                    { label: "Homepage crop (4:5)", aspectClass: "aspect-[4/5]" },
                  ]}
                  className="max-w-sm"
                  previewClassName="w-full max-w-[220px]"
                />
                <div className="mt-4">
                  <ActionButton
                    action={removeStudioImageAction}
                    confirmMessage="Remove the studio photo from the homepage?"
                    className={REMOVE_BUTTON_CLASS}
                  >
                    Remove photo
                  </ActionButton>
                </div>
              </>
            ) : (
              <p className={`text-sm ${INK_SOFT}`}>
                No studio photo yet. Until you add one, the homepage shows
                the studio text on its own.
              </p>
            )}
          </div>

          <div>
            <p className={`mb-1 ${LABEL_CLASS}`}>Portrait (optional)</p>
            <p className={`mb-3 text-sm ${INK_SOFT}`}>
              Shown small and round next to your name. Use a
              head-and-shoulders photo, not a crop of your hands photo.
            </p>
            <ActionForm
              action={uploadStudioPortraitAction}
              directUpload={{
                field: "studioPortrait",
                target: { kind: "studio-portrait" },
              }}
              className="mb-6 flex items-center gap-2"
            >
              <input
                type="file"
                name="studioPortrait"
                accept="image/*"
                required
                aria-label="Portrait"
                className={FILE_INPUT_CLASS}
              />
              <SubmitButton
                pendingLabel="Uploading…"
                className={PILL_BUTTON_CLASS}
              >
                Upload
              </SubmitButton>
            </ActionForm>

            {settings.homepageStudioPortraitUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.homepageStudioPortraitUrl}
                  alt="Current portrait"
                  className="size-24 rounded-full object-cover"
                />
                <ActionButton
                  action={removeStudioPortraitAction}
                  confirmMessage="Remove the portrait from the homepage?"
                  className={REMOVE_BUTTON_CLASS}
                >
                  Remove portrait
                </ActionButton>
              </div>
            ) : (
              <p className={`text-sm ${INK_SOFT}`}>No portrait yet.</p>
            )}
            {settings.homepageStudioPortraitUrl &&
              !settings.homepageStudioQuote.trim() && (
                <p className={`mt-3 text-sm ${INK_SOFT}`}>
                  The portrait only shows next to a quote.
                </p>
              )}
          </div>
        </div>
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
                  aria-describedby="studioHeadingHelp"
                  defaultValue={settings.homepageStudioHeading}
                  className={FIELD_CLASS}
                />
                <p id="studioHeadingHelp" className={`text-xs ${INK_SOFT}`}>
                  Shown as a small label above the quote when there is one.
                </p>
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
              <div className="col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioImageAlt">
                  Studio photo description
                </label>
                <input
                  id="studioImageAlt"
                  name="studioImageAlt"
                  aria-describedby="studioImageAltHelp"
                  defaultValue={settings.homepageStudioImageAlt}
                  className={FIELD_CLASS}
                />
                <p id="studioImageAltHelp" className={`text-xs ${INK_SOFT}`}>
                  For screen readers. Describe what&apos;s in the photo, e.g.
                  &lsquo;Hands saddle-stitching the edge of a tan leather
                  wallet.&rsquo;
                </p>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioQuote">
                  Quote
                </label>
                <CharCountTextarea
                  id="studioQuote"
                  name="studioQuote"
                  rows={2}
                  defaultValue={settings.homepageStudioQuote}
                  softLimit={STUDIO_QUOTE_SOFT_LIMIT}
                  describedBy="studioQuoteHelp"
                  className={FIELD_CLASS}
                />
                <p id="studioQuoteHelp" className={`text-xs ${INK_SOFT}`}>
                  Optional. One or two short sentences in your own words.
                  Leave empty to hide the quote and credit.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioName">
                  Name
                </label>
                <input
                  id="studioName"
                  name="studioName"
                  aria-describedby="studioNameHelp"
                  defaultValue={settings.homepageStudioName}
                  className={FIELD_CLASS}
                />
                <p id="studioNameHelp" className={`text-xs ${INK_SOFT}`}>
                  Required when there&apos;s a quote.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="studioRole">
                  Role
                </label>
                <input
                  id="studioRole"
                  name="studioRole"
                  aria-describedby="studioRoleHelp"
                  defaultValue={settings.homepageStudioRole}
                  className={FIELD_CLASS}
                />
                <p id="studioRoleHelp" className={`text-xs ${INK_SOFT}`}>
                  Optional.
                </p>
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
