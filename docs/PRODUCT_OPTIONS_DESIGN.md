# Product Options Design

Design doc for the "Product options beyond color" item in
[IMPROVEMENTS.md](./IMPROVEMENTS.md). Written before implementation per the
project's own rule of documenting non-trivial architecture changes ahead of
building them (see [ARCHITECTURE.md](./ARCHITECTURE.md),
[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)).

## Course correction (read this first)

**Status: implemented in code** (migration `0010_product_level_stock.sql`
written, not yet run against the live DB — see `MANUAL_TASKS.md`; don't
merge `feat/product-options` to `develop` until it has).

The business model was clarified after most of this design's original
version had already shipped: **all v1 products are made-to-order** (no
separate ready-made/in-stock catalog type — see
[PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) §5), and **stock is
tracked as one capacity number per product, not per variant/option
combination.** Regardless of which color/size/thread a customer picks, it
draws from the same product-level count.

This reverses a decision the original version of this doc made
deliberately (`product_variants.stock_quantity`, one count per option
combination). **That version already shipped**, not just as a design:
- Migration `0009_product_options.sql` is live (per `MANUAL_TASKS.md`) and
  kept `stock_quantity`/`in_stock` on `product_variants`.
- `src/lib/admin/catalog.ts`'s `createVariant`/`updateVariantStock` take a
  per-variant `stockQuantity`.
- `src/app/admin/actions.ts`'s `createVariantAction`/`updateAllVariantsAction`
  (or equivalent) collect a `stockQuantity` field per variant row.
- `src/app/admin/products/[id]/page.tsx` renders a stock input per variant
  row.
- `src/lib/orders.ts` calls `decrement_variant_stock`/`restore_variant_stock`
  (from `0002_stock_functions.sql`) keyed on `variant_id`.

So implementing this correction is **not** a fresh build — it's a rework of
already-shipped schema and code, and it needs a **new forward migration**
(e.g. `0010_...`) rather than editing `0009` in place, since `0009` already
ran against the live database (this project never amends a migration that's
already been applied — see the project rule in `CLAUDE.md` and how every
prior schema change got its own numbered file). The rest of this doc below
is the **original** per-variant-stock version, left as historical design
record; the sections below it that are affected by this correction are
marked inline. Read this section's summary as the current source of truth
for the stock model; treat the rest as superseded where they conflict.

**What changes under the correction:**
- New migration: add `stock_quantity`/`in_stock` (generated, same pattern
  as today) to `products`; drop those two columns from `product_variants`
  (keep `id`, `product_id` there — a variant is now purely an option
  combination, no stock of its own).
- `decrement_variant_stock`/`restore_variant_stock` (0002) become
  `decrement_product_stock`/`restore_product_stock`, keyed on `product_id`
  instead of `variant_id`. Update every call site in `src/lib/orders.ts`
  (order placement, manual cancel, payment-hold expiry) to resolve
  `variantId` → `productId` first (via the variant's existing FK) and pass
  that.
- `createVariant`/`updateVariantStock` in `src/lib/admin/catalog.ts` lose
  their `stockQuantity` parameter entirely — a variant is created from
  option-value picks only. New `updateProductStock(productId, quantity)`
  (or fold into the existing product-update action) replaces it.
- Admin UI (`src/app/admin/products/[id]/page.tsx`): stock input moves from
  the per-variant row up to the product-details section (one field, next
  to price/lead time), and disappears from each variant row entirely.
- PDP (`src/app/products/[slug]/ProductDetail.tsx`): availability
  ("sold out") is a single product-level fact now, not something that can
  differ per swatch combination — this **deletes the need for** design
  decision 3 below ("no per-swatch cross-dimension stock awareness" /
  "not available in this combination" message). Once a product is sold
  out, every option combination is uniformly unavailable; Add to Cart just
  disables based on the product's own status, same as today's
  `!orderingEnabled` check.
- `docs/USER_STORIES.md` US-23/24/25/25b already updated to "capacity per
  product, not per variant" language — no further story changes needed.

## New scope: admin-configurable option display style

Not a correction — additional scope on top of what shipped. Today the PDP
(`src/app/products/[slug]/ProductDetail.tsx`, checkpoint 4) renders every
option type identically: a row of pill/swatch buttons, regardless of type
or how many values it has. [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md)
§5 separately claims thread color is specifically "presented as a
**dropdown**" — that was never actually built as a special case, and
hardcoding it to thread-color-only was the wrong level of generality
anyway. New requirement: **the admin picks a display style (buttons or
dropdown) per option type**, not hardcoded by name and not just for
thread color — e.g. swatch buttons for a handful of colors, a dropdown for
a long size or length list.

**Schema addition** (fold into the same pre-merge migration as the stock
correction above, or its own — implementer's call): add a
`display_style text not null default 'buttons' check (display_style in
('buttons', 'dropdown'))` column to `product_option_types`.

**Code touchpoints:**
- `src/lib/admin/catalog.ts` — `createOptionType`/`updateOptionType` gain a
  `displayStyle` param; `getProductForAdmin`/`getProductBySlug` (in
  `src/lib/products.ts`) return it on each `optionTypes` entry.
- Admin UI (`src/app/admin/products/[id]/page.tsx`'s Options section) —
  add a radio/select for display style when creating or editing an option
  type.
- PDP (`src/app/products/[slug]/ProductDetail.tsx` ~line 58-84) — branch
  per `type.displayStyle`: keep the existing button-row markup for
  `'buttons'`, add a `<select>` (single `onChange` setting
  `selectedOptions[type.name]`) for `'dropdown'`. Same underlying
  `selectedOptions`/`selectedVariant` matching logic either way — this is
  a rendering choice only, not a data-model change to variants.
- PRD §5's thread-color-specific "presented as a dropdown" line should be
  generalized to "admin chooses a display style per option type" once this
  ships — thread color isn't special-cased in code, it just typically gets
  set to dropdown by the admin.

## Why

Today a product variant is a single flat dimension: `product_variants.label`
(free text, e.g. "Black") + a stock count. The PDP hardcodes a "Color"
heading over one row of swatches built from that one label list. This is a
real gap against the original spec, not new scope —
[PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) §3/§5 and **US-3**
(see [USER_STORIES.md](./USER_STORIES.md)) call for "select a color, size,
and thread color from fixed dropdown/swatch options," but only the single
flat dimension got built.

## Outcome

A product can have multiple admin-defined option types (Color, Thread
Color, Size, ...), each with its own ordered value list. A real variant =
one value per option type, each with its own stock count.

Confirmed via a live read-only query before designing this: real
`order_items` rows already reference existing `product_variants.id`s by
FK, so the migration must **preserve existing variant row ids** — only
restructure how each row's label is represented, never recreate the rows.

## Schema (`supabase/migrations/0009_product_options.sql`)

```sql
create table product_option_types (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,              -- "Color", "Thread Color", "Size"
  position integer not null default 0,
  unique (product_id, name)
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_type_id uuid not null references product_option_types(id) on delete cascade,
  value text not null,             -- "Black", "Natural Thread"
  position integer not null default 0,
  unique (option_type_id, value)
);

create table product_variant_options (
  variant_id uuid not null references product_variants(id) on delete cascade,
  option_value_id uuid not null references product_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);
```

`order_items` gains a `variant_label text not null` column — the display
label is **snapshotted at order time**, same reasoning as the existing
`unit_price_centavos` snapshot: a later rename/deletion of an option value
shouldn't rewrite historical order display. Existing rows are backfilled
from the live `product_variants.label` before it's dropped.

Existing data migrates losslessly: every current product's variants become
a single "Color" option type + one value per existing label + one
variant/value link (the existing `unique(product_id, label)` constraint
already guarantees no dedup is needed). `product_variants` keeps only
`id, product_id, stock_quantity, in_stock (generated)` — `label` is
dropped.

> **Superseded by the course correction above.** This is what migration
> `0009` actually shipped. The forward-fix migration moves
> `stock_quantity`/`in_stock` off `product_variants` and onto `products`
> instead — see the correction section for the exact column/function
> changes needed.

`decrement_variant_stock`/`restore_variant_stock` (0002) need **no
changes** — both still key off a single `variant_id` row; stock stays
per-variant regardless of how many option dimensions compose it.

> **Superseded.** These now need to become `decrement_product_stock`/
> `restore_product_stock`, keyed on `product_id` — see the correction
> section above for exact call-site changes in `src/lib/orders.ts`.

## Design decisions

1. **No DB-level uniqueness on "no two variants share the same
   combination"** — `product_variant_options` can't express that as a
   simple constraint. Enforced in app code instead. Fine at this scale
   (a handful of products, a few option types each).
2. **Variant combinations are immutable after creation.** To change a
   combination, delete and re-add. Avoids collision-handling complexity
   for in-place combination edits. (Originally also covered
   `stock_quantity` being the one mutable field — moot now that stock
   isn't on the variant at all; nothing about a variant is editable
   in-place post-correction except which product it belongs to.)
3. ~~**No per-swatch cross-dimension stock awareness**~~ — **superseded,
   and no longer needed.** This whole problem (whether "Black" should be
   disabled depending on what's picked for other dimensions, or showing a
   "not available in this combination" message) only existed because
   stock was per-variant. With stock per-product, availability is a
   single fact for the whole product — every option combination is
   either all orderable or all sold out together. No swatch-disabling
   logic needed at all.
4. **Manual variant creation, not auto-generated combinations** — admin
   defines option types + values, then explicitly creates each variant by
   picking one value per type from dropdowns + a stock count. Rejected
   auto-generating the full cartesian product: bigger UI to build, and not
   every combination is necessarily a real orderable product at this
   shop's scale.
5. **Old localStorage carts break gracefully, no migration needed** —
   existing `CartItem` shape has no `variantId`. After this ships, an old
   cart item's `variantId` is `undefined`; checkout's `/api/orders`
   validation fails to find a matching variant and returns the existing
   "unavailable" error path (already handles a missing/invalid variant
   today). Cart data is disposable client state.

## Code touchpoints

- **`src/lib/admin/catalog.ts`** — new option-type/value CRUD
  (`createOptionType`, `updateOptionType`, `deleteOptionType`,
  `createOptionValue`, `updateOptionValue`, `deleteOptionValue`, all
  already shipped and unaffected by the correction), reworked variant CRUD
  (`createVariant(productId, optionValueIds, stockQuantity)` replaces
  label-based `addVariant`; `updateVariantStock` replaces `updateVariant`).
  `getProductForAdmin` returns `optionTypes` + each variant's composed
  `label`/`optionValueIds`.
  > **Superseded:** `createVariant` drops the `stockQuantity` param
  > entirely (variant = option picks only); `updateVariantStock` goes
  > away, replaced by a product-level `updateProductStock(productId,
  > quantity)`. Both already exist today with the old per-variant
  > signature — see the correction section above.
- **`src/app/admin/actions.ts`** — new Server Actions following the
  existing `runAction()`/`ActionResult` pattern.
  > `createVariantAction`/`updateAllVariantsAction` (already shipped) need
  > their `stockQuantity` handling removed/moved per the correction.
- **`src/app/admin/products/[id]/page.tsx`** — new "Options" section
  (list-CRUD matching the existing FAQ-item pattern, already shipped),
  reworked "Variants" section (read-only option values + editable stock
  per row; "Add variant" becomes one `<select>` per option type instead of
  a label input).
  > **Superseded:** the per-row stock input moves up to a single field in
  > the product-details section per the correction — variant rows show
  > only their option combination, no stock input.
- **`src/lib/products.ts`** — `Product` gains `optionTypes:
  { id, name, values: string[] }[]`; `ProductVariant` gains `options:
  Record<string, string>` (replaces bare `label` as the selection key,
  `label` stays as the composed display string).
- **`src/app/products/[slug]/ProductDetail.tsx`** — `selectedOptions:
  Record<string,string>` state instead of a single label string; one
  swatch group per `product.optionTypes` entry instead of a hardcoded
  "Color" heading.
- **`src/lib/cart-context.tsx`** — `CartItem.variant: string` →
  `variantId: string` (identity key) + `variantLabel: string` (display).
- **`src/app/cart/CartView.tsx`, `src/app/checkout/CheckoutForm.tsx`** —
  use `variantId` for identity/keys, `variantLabel` for display; checkout
  POST body becomes `{ slug, variantId, quantity }`.
- **`src/app/api/orders/route.ts`** — validates via
  `product.variants.find(v => v.id === requested.variantId)` instead of a
  label match.
- **`src/lib/orders.ts`** — `OrderItem.variant` → `OrderItem.variantLabel`,
  sourced from the new `order_items.variant_label` snapshot column instead
  of a live join.
- **`src/lib/email.ts`, `src/app/admin/orders/page.tsx`** — rename
  `item.variant` → `item.variantLabel` in existing format strings only.

## Implementation checkpoints (own commit each)

**All of checkpoints 0-7 are done** on this branch (`feat/product-options`).
**Not yet merged to `develop`** — blocked only on running migration
`0010_product_level_stock.sql` against the live DB and verifying it (see
`MANUAL_TASKS.md`), since every prior migration in this project has needed
a human to run it via the Supabase SQL editor.

0. **Course-correction migration + rework.** **Done** (code). Migration
   `0010_product_level_stock.sql` written, not yet run live:
   - Adds `stock_quantity`/`in_stock` to `products` (backfilled by summing
     each product's existing per-variant `stock_quantity`, so nothing
     already set is lost); drops both columns from `product_variants`.
   - Drops `decrement_variant_stock`/`restore_variant_stock` (0002, can't
     be edited in place — already ran) and replaces them with
     `decrement_product_stock`/`restore_product_stock`, keyed on
     `product_id`.
   - Adds `display_style` to `product_option_types` (the "New scope"
     section above — buttons vs dropdown, admin's choice per type).
   - `src/lib/admin/catalog.ts`: `createVariant` lost its `stockQuantity`
     param entirely; `updateVariantStock` removed — stock is now part of
     `ProductInput`, edited via the existing `createProduct`/`updateProduct`.
     `createOptionType`/`updateOptionType` gained a `displayStyle` param.
   - `src/app/admin/actions.ts`/`src/app/admin/products/[id]/page.tsx`:
     stock field moved to the product-details section
     (`ProductFormFields`); the Variants section is now a read-only combo
     list + delete only (no per-row stock input, no batch-save form —
     `updateAllVariantsAction` removed); Options section gained a
     buttons/dropdown select per option type.
   - `src/lib/orders.ts`: `createOrder`/`cancelOrderAndRestoreStock` now
     call the renamed RPCs keyed on each item's `productId` instead of
     `variantId`. `src/app/api/orders/route.ts` validates via
     `product.inStock` instead of `variant.inStock`.
   - `src/app/products/[slug]/ProductDetail.tsx`: `canAddToCart` reads
     `product.inStock` (single fact for the whole product); option types
     with `displayStyle: "dropdown"` render a `<select>` instead of the
     button row; added a distinct "Sold out" button label.
   - `tests/orders.test.ts`, `tests/api-orders.test.ts`,
     `tests/admin-catalog-options.test.ts` reworked to key stock
     assertions off `products`/`product_id` instead of
     `product_variants`/`variant_id`; the "sold-out variant" test now
     temporarily zeroes the product's `stock_quantity` (capacity is
     product-wide, not per variant) instead of relying on a
     pre-sold-out seed variant.
1. Migration + live-DB verification. **Done** (`0009`, plus `0010` above
   pending the live run).
2. Admin lib layer (option-type/value CRUD, reworked variant CRUD) +
   Server Actions. **Done**, including the checkpoint 0 rework.
3. Admin UI (Options section, reworked Variants section). **Done**,
   including the checkpoint 0 rework.
4. Public `products.ts` + PDP rework. **Done**, including the checkpoint 0
   simplification (no per-combination availability logic — a single
   product-level fact).
5. Cart/checkout/orders/email rename + rework. **Done**, including the
   checkpoint 0 rework for the actual stock calls.
6. Tests. **Done**, updated per checkpoint 0.
7. Docs (`ARCHITECTURE.md`, `IMPROVEMENTS.md`, `MANUAL_TASKS.md`,
   `MANUAL_TESTING.md`). **Done**, updated per checkpoint 0.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm test` after each checkpoint.
- Live-verify the migration preserves existing wallet/tote variants and
  historical order display (read-only script against the dev DB).
- Manual browser session for the admin Options/Variants UI and the PDP's
  multi-dimension swatch selection (can't be curl-verified).
