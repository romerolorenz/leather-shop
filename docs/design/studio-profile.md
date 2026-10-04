# Homepage Studio section: studio photo and maker profile

**Status: approved 2026-10-04.** Variant 3 (flexible). The comparison
mockup (defaulting to Variant 3, other variants kept for the record) is
linked from [docs/DESIGN_LOG.md](../DESIGN_LOG.md) (2026-10-04, "Studio
section: photo and maker profile").

Extends [homepage.md](homepage.md) §5.3 and follows
[STYLE_GUIDE.md](STYLE_GUIDE.md) ("Quiet & Confident"). This deliberately
overrides one line of §5.3 ("no pull-quote treatment, no attribution
line"), because a short attributed quote is now the point of the section.

## Decisions (2026-10-04)

1. **One Studio section.** The photo and maker profile live inside the
   existing Studio section. A separate maker section was considered and
   declined.
2. **Variant 3, flexible.** A main studio photo plus an optional small
   portrait. With no portrait the section takes the 3a look (full photo
   profile); with one, the 3b look (face + hands).
3. **"Learn more" stays as it is**, linking to /faq. Not retargeted.
4. **A future /about page** is logged as an Outstanding idea in
   [DESIGN_IMPROVEMENTS.md](../DESIGN_IMPROVEMENTS.md). When it exists,
   the homepage link becomes "About the studio" → /about.
5. **Content stays placeholder and does not block the build.** The
   credit name and role, the quote, and the body copy are all
   owner-editable in /admin/homepage. The owner fills them in after the
   build (tracked in MANUAL_TASKS.md). Recommended body wording, first
   person to match the quote:
   > Every bag and wallet starts as a single hide, cut and hand-stitched
   > in my small studio in Metro Manila. I work in small batches, not a
   > production line, so each order gets my attention from start to
   > finish.

## 1. Purpose

Customers pay by bank transfer, GCash or Maya *after* ordering, from a
shop they have probably never heard of. A real, visible maker is the
cheapest trust signal the homepage can carry. The section should answer
two quiet questions without a new page:

- **Is a real person behind this?** A face, a name, a role.
- **Is it really handmade?** Hands at work, or the maker at the bench.

Audience: a first-time shopper who scrolled past the hero and the featured
grid and is deciding whether to trust the shop. Secondary audience: the
non-technical owner, who must be able to keep this section looking good
with their own phone photos.

The homepage keeps its three-beat rhythm: hero, featured grid, studio. No
new section is added; the Studio section gets a photo and a quote.

## 2. Agreed direction (A1 + B2)

- **A1, side-by-side photo.** One 4:5 photo on one side, text on the
  other. Stacks photo-first on mobile.
- **B2, quote-led maker profile.** A short first-person quote, a credit
  line, and optionally a small round portrait, inside the text column.

## 3. The three variants

All three share the same layout (§4). They differ in what the big photo
shows and whether a small portrait sits by the credit.

### Variant 1: Face + hands

Big photo: a close-up of hands at work (stitching, edge-burnishing,
cutting). Small round portrait (48px) beside the credit line.

| Pros | Cons |
|---|---|
| Hands are the strongest proof of craft; close-ups are forgiving and easy to shoot well on a phone. | Needs **two** good photos, and the face is tiny. |
| The owner never has to be the hero of a big photo. | Two photos in one section is a little busier. |
| Hands shots age well and can be reshot any time. | A face cropped out of a hands shot does not work as the portrait. It must be its own shot. |

### Variant 2: Full photo profile

Big photo: one environmental portrait. The maker at the bench, face and
hands both in frame, looking at the work. No small portrait.

| Pros | Cons |
|---|---|
| One photo does both jobs (person and craft). Calmest result. | Needs one *good* shot: light, framing and an uncluttered bench all have to work at once. Harder for a solo maker without help. |
| Biggest trust signal: a real face at a readable size. | Puts the owner front and centre, which they may not want. |
| Fewest fields for the owner to manage. | At 4:5 the hands can get small; craft proof is weaker than Variant 1. |

### Variant 3: Flexible (main photo + optional portrait)

The admin model behind both looks. One required-for-display main photo,
plus an optional small portrait. The layout adapts:

- **3a. Main photo only:** renders exactly like Variant 2.
- **3b. Main photo + portrait:** renders exactly like Variant 1.

| Pros | Cons |
|---|---|
| No commitment now. The owner can start with whatever photo they have and switch looks later by adding or removing the portrait. | A few more admin fields and one more upload, and slightly more build work (about one extra upload + focal point). |
| Same build cost covers both looks; the code path for 3a is a strict subset of 3b. | The owner has to understand that the main photo should match the choice (hands close-up with a portrait; maker-at-bench without). Needs one line of helper text. |

**Decided: Variant 3.** It costs little more than either fixed variant
and avoids deciding before real photos exist. Start in the 3a look if one
good bench portrait can be shot; otherwise use 3b with a hands close-up
and a separate head-and-shoulders photo.

## 4. Layout

### Desktop (≥ 768px, `md`)

- Container: `mx-auto max-w-6xl px-6`, the exact classes of the featured
  grid section above, so the photo's left edge lines up with the first
  product photo. (The hairline between them uses `px-6 sm:px-10`, an
  existing 16px mismatch at `sm`+ that this design does not change.)
- Two-column grid: `md:grid md:grid-cols-12 md:gap-12 lg:gap-16 md:items-center`.
  Photo spans `md:col-span-5`; text spans `md:col-span-6 md:col-start-7`
  (one empty column of breathing room).
- Photo left, text right. The featured grid above reads left to right and
  ends in text; the studio photo starting the next row keeps the rhythm.
- Photo: `aspect-[4/5]` with `object-cover` and admin focal point. No
  border, radius or shadow, same as product photos.
- Section padding: `pt-16 pb-24 sm:pb-32` as today.

### Text column order

1. **Heading**: `homepageStudioHeading` ("The studio"), always an `<h2>`.
   When a quote is shown it takes eyebrow styling, because the quote is
   now the largest text. Without a quote it keeps today's section-heading
   styling.
2. **Quote** (`<blockquote>`): `text-xl sm:text-[1.75rem] font-medium
   leading-snug tracking-tight text-balance`, ink. Curly quotes (“ ”)
   added by markup, not typed by the owner. No italics, no serif, no
   oversized decorative quote mark (STYLE_GUIDE: one family, no flourish).
3. **Credit** (`<figcaption>`): `text-sm`, name in ink `font-medium`,
   role in ink-soft, separated by a comma. Format: "— [Name], founder &
   leatherworker". In 3b / Variant 1, a 48px round portrait
   (`size-12 rounded-full object-cover`) sits left of the credit,
   `flex items-center gap-3`.
4. **Body**: `homepageStudioBody`, `text-base leading-relaxed`, ink at 90%,
   `mt-8`, kept at `max-w-[34rem]`.
5. **Link**: "Learn more" → /faq, unchanged (see §9).

### Mobile (< 768px)

- Single column: photo first, full container width, `aspect-[4/5]`, then
  the text column with `mt-8`.
- Quote drops to `text-xl`. Everything else unchanged.
- Portrait stays 48px (tap-sized, but it is not a tap target).

### No hero-style overlay

Text never sits on the photo. Owner photos vary too much for overlay text
to stay legible.

## 5. Type and colour

STYLE_GUIDE tokens only, no new ones.

| Element | Token / classes |
|---|---|
| Eyebrow | Ink-soft `#6E6A64`, `text-xs font-medium uppercase tracking-[0.08em]` |
| Quote | Ink `#1C1A18`, Archivo 500 |
| Credit name | Ink, Archivo 500 |
| Credit role | Ink-soft |
| Body | Ink at 90% |
| Link | Accent `#7A3B22` |
| Empty photo fill (admin preview only) | `#f3f1ec`, the same as empty product tiles |

Light mode only (dark mode is shelved). Archivo stays the only family.

## 6. Admin fields (`/admin/homepage`, Variant 3)

Reuse the hero image pattern: `ActionForm` with `directUpload` to the
`site-images` bucket, then the focal-point picker. Every save gets a
toast as usual.

| Field | Setting key | Notes |
|---|---|---|
| Studio heading (existing, now shown as the eyebrow) | `homepage_studio_heading` | unchanged |
| Studio body (existing) | `homepage_studio_body` | unchanged |
| Studio photo | `homepage_studio_image_url` | upload, instant commit |
| Studio photo focal point | `homepage_studio_focal_x`, `homepage_studio_focal_y` | reset to 50/50 on each new upload |
| Studio photo description (alt text) | `homepage_studio_image_alt` | text form, optional |
| Portrait | `homepage_studio_portrait_url` | upload, instant commit, optional, removable. No focal point: it is centre-cropped to a circle, and the shot list asks for a centred face. |
| Quote | `homepage_studio_quote` | text form, optional, soft limit 140 characters |
| Name | `homepage_studio_name` | text form, required when a quote is entered |
| Role | `homepage_studio_role` | text form, optional |

- The studio photo's focal-point previews show a 4:5 crop (desktop) and
  the same 4:5 at mobile width. The hero's 9:16 / 16:9 previews don't
  apply.
- The portrait gets a round 96px preview and a "Remove portrait"
  `ActionButton`, which switches the section to the 3a look. The studio
  photo gets a "Remove photo" `ActionButton` too.
- Helper text under the studio photo: "With a portrait: use a close-up
  of your hands at work. Without one: use a photo of you at the bench."
- Quote has a live character counter that turns warning-colour above 140.
  Going over the limit is allowed.

## 7. States

| State | What the shopper sees |
|---|---|
| Nothing new set (today) | Exactly today's text-only centred column. Existing content never regresses. |
| Main photo, no quote | Photo + heading (today's section-heading style) + body + link. No figure, no credit, no portrait. |
| Quote, no main photo | Today's centred column, heading as eyebrow, quote figure above the body. Portrait shows if set. |
| Main photo + quote | Variant 2 / 3a look. |
| Main photo + quote + portrait | Variant 1 / 3b look. |
| Portrait but no quote | Portrait is not shown (it only exists to sit beside the credit). Admin shows a note saying so. |
| Photo fails to load | Image box keeps its `#f3f1ec` fill and 4:5 size, so the layout does not jump. |

Admin empty state for the main photo: "No studio photo yet. Until you add
one, the homepage shows the studio text on its own."

Loading: images are below the fold, so `next/image` lazy-loads them; no
skeleton beyond the `#f3f1ec` fill. Motion: the existing `Reveal` fade on
the whole section, nothing else. No hover zoom (the photo is not a link).

## 8. Accessibility

- Markup:
  ```html
  <figure>
    <blockquote><p>…quote…</p></blockquote>
    <figcaption>[portrait img alt=""] — <span>Name</span>, role</figcaption>
  </figure>
  ```
- Main photo alt text comes from the admin field. Guidance under the
  field: "Describe what's in the photo, e.g. 'Hands saddle-stitching the
  edge of a tan leather wallet.'" If empty, fall back to `alt=""` (do not
  invent alt from the filename).
- Portrait is `alt=""`: the name is already in the caption next to it, so
  a screen reader would otherwise hear the name twice.
- Quote text contrast: ink on white is about 17:1. Ink-soft role text is
  about 5.3:1 (passes AA for small text).
- The link keeps a visible focus ring (`focus-visible:outline`).

## 9. "Learn more" link

**Decided: unchanged.** "Learn more" → /faq, the same classes as today.
When a /about page is built (see DESIGN_IMPROVEMENTS.md), change it to
"About the studio" → /about.

## 10. Shot list and photo guidance

For the owner, shooting on a phone. All shots in **natural daylight**
from a side window, no flash, no ring light. Plain bench, tools in use,
clutter cleared.

1. **Hands at work (main photo, Variant 1 / 3b).** Close-up, top-down or
   slightly angled. Two-needle saddle stitch, edge burnishing, or cutting
   along a steel rule. Hands and leather fill most of the frame. Shoot in
   portrait orientation; it will be cropped to 4:5.
2. **Maker at the bench (main photo, Variant 2 / 3a).** Waist-up, 1–2 m
   away, the maker **looking at the work, not the camera**. Face and hands
   both visible. Leave some space around the head so the 4:5 crop has
   room. Ask someone else to take it, or use a timer and a stand.
3. **Portrait (Variant 1 / 3b).** Head and shoulders, plain background,
   soft window light. Looking at the camera is fine here. Keep the face
   centred: it is cropped to a circle and shown at 48px, so the face
   should fill about two-thirds of the frame.

Crops: main photo 4:5 (e.g. 1600 × 2000 px minimum). Portrait square,
at least 400 × 400 px. The focal-point picker handles off-centre subjects.

Avoid: posed thumbs-up shots, heavy filters, logo overlays, stock photos.
A real, slightly imperfect photo beats a polished fake one.

## 11. Owner content (fill in after the build)

None of these block the build. All are editable in /admin/homepage.

1. **Credit:** real name and role. The role seeds as "founder &
   leatherworker"; the name seeds empty.
2. **Quote:** in the owner's own words, short and understated. Seeds
   empty, so the quote and credit stay hidden until the owner writes one.
   Example: "Every piece is cut and stitched by hand in my Manila studio."
3. **Body copy:** switch "we" to "I" (recommended wording in Decisions
   §5).
4. **Photos:** studio photo and optional portrait, per the shot list
   (§10).

## 12. Out of scope

- A full /about or "Meet the maker" page (logged as an idea in DESIGN_IMPROVEMENTS.md).
- More than one maker, or a team grid.
- Video, carousels, or any looping motion.
- Social links or a signature image in the credit.
- Dark-mode styling (shelved site-wide).
