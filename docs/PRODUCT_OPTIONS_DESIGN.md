# Product Options Design

Design doc for the "Product options beyond color" item in
[IMPROVEMENTS.md](./IMPROVEMENTS.md). Written before implementation per the
project's own rule of documenting non-trivial architecture changes ahead of
building them (see [ARCHITECTURE.md](./ARCHITECTURE.md),
[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)).

## Second course correction: drop the variant entity entirely (read this first)

**Status: implemented in code** (migration
`0011_option_library_and_order_item_options.sql` written, combined with the
Third course correction below per its "Combined migration plan" — not yet
run against the live DB, see `MANUAL_TASKS.md`; don't merge
`feat/product-options` until it has). Everything below this section
(the stock course correction, the original per-variant design) describes
what's actually built on `feat/product-options` today. This section is new
scope the owner asked for on top of that — not started yet.

**The ask:** let go of "variant" as a thing the admin has to create.
Today, after defining option types/values (Color, Size, ...), the admin
must *also* manually create a `product_variants` row for every sellable
combination (checkpoint 0's design decision 4) before a customer can order
it — pick "Black" + "Large" from dropdowns, click "Add variant". A
combination the admin never explicitly created shows "Not available in
this combination" even though every option value involved is valid and
stock is already tracked per-product, not per-combination. That admin step
no longer earns its keep now that the stock course correction (below) made
availability a single per-product fact: **any combination of the product's
own option values should be orderable**, full stop. No backwards
compatibility is required — existing `product_variants`/
`product_variant_options` rows and their FK from `order_items` can be
dropped rather than migrated forward.

**What changes:**

- **`product_variants` and `product_variant_options` are dropped**, along
  with all admin CRUD for them (`createVariant`, `deleteVariant`,
  `DuplicateVariantError` in `src/lib/admin/catalog.ts`;
  `deleteVariantAction` in `src/app/admin/actions.ts`; the entire
  "Variants" section of `src/app/admin/products/[id]/page.tsx`, including
  its "Add variant" dropdowns). The admin now only ever manages option
  *types* and *values* — already-shipped CRUD, unaffected. A product is
  orderable as soon as it has `ordering_enabled = true` and
  `stock_quantity > 0`; if it has option types, the shopper must pick one
  value per type, but there is no admin-side gate on *which* combinations
  are allowed.
- **The PDP's "not available in this combination" state goes away** —
  it can't happen anymore, since every combination of the product's own
  values is valid by construction. `canAddToCart` becomes
  `orderingEnabled && inStock && optionTypes.every(t => !!selectedOptions[t.name])`
  (still false in the interstitial moment before a value is picked for
  every type; no longer conditioned on a matching variant row).
- **Selected options are recorded directly on the order, not resolved
  through a variant id.** New table, one row per selected option per order
  item:

  ```sql
  create table order_item_options (
    id uuid primary key default gen_random_uuid(),
    order_item_id uuid not null references order_items(id) on delete cascade,
    option_type_name text not null,  -- snapshot, e.g. "Color"
    option_value text not null,      -- snapshot, e.g. "Black"
    position integer not null default 0
  );
  ```

  Both columns are snapshotted as plain text at order time, same reasoning
  as the `variant_label` snapshot it replaces (and `unit_price_centavos`
  before that): a later rename/delete of an option type or value shouldn't
  rewrite historical order display. Not FKs to `product_option_types`/
  `product_option_values` — deliberately, so deleting an option value
  later can't be blocked by, or corrupt, past orders.
- **`order_items` drops `variant_id` and `variant_label`.** `product_id`
  (already present) is enough to identify what was ordered; the specific
  combination lives in `order_item_options`.
- **Cart identity changes.** `CartItem.variantId` (a single id) becomes
  `CartItem.selectedOptions: Record<string, string>` (option type name →
  chosen value). Cart-item identity (dedup on add, key for remove/adjust
  quantity) becomes `slug` + a stable serialization of `selectedOptions`
  (sort entries by type name, join) instead of `slug` + `variantId`.
  Products with no option types keep working the same way they do today
  (`selectedOptions` is just `{}`).
- **Checkout POST body** becomes `{ slug, selectedOptions, quantity }`
  instead of `{ slug, variantId, quantity }`. `POST /api/orders` validates
  server-side that `selectedOptions` has exactly one entry per the
  product's `optionTypes`, and that each value is actually one of that
  type's current `values` — same "never trust the client" posture the
  route already has for price/stock, just checked against option values
  instead of a variant row.
- **Display strings** ("Black" as a single label) become "Color: Black,
  Size: Large" — join `optionTypes` order → value pairs with `", "`,
  each pair `"{type}: {value}"`. Touches `src/lib/email.ts`,
  `src/app/admin/orders/page.tsx`, `src/app/account/page.tsx`,
  `src/app/cart/CartView.tsx`, `src/app/checkout/CheckoutForm.tsx`.
- **`InsufficientStockError`** drops its `variantLabel` constructor param
  (message becomes just `"{productName} no longer has enough stock."` —
  it was already a per-product fact, the variant label in the message was
  vestigial).

**Migration sequencing:** `0010_product_level_stock.sql` has **not been
run against the live DB yet** (see `MANUAL_TASKS.md`), so per the
project's "never amend an already-applied migration" rule it's still fair
game to edit in place — but see the **combined migration plan** in the
Third course correction below: `product_option_types`/
`product_option_values` **are** already live (migration `0009`), so
reusable options needs its own new migration regardless, and that
migration already has to read through `product_variant_options` →
`product_option_values` → `product_option_types` before touching those
tables. Cleanest sequencing is to do the variant-drop backfill
(`order_item_options`) and the option-globalization backfill in that same
new migration, in that order, then drop everything old in one go at the
end — rather than making `0010` do half of this and a second new
migration do the rest. `0010` stays scoped to just the stock move +
`display_style` it already has.

**Not affected by this correction** (already correct, no further change):
the stock model itself (per-product capacity, `decrement_product_stock`/
`restore_product_stock`), `display_style` (buttons vs. dropdown), and all
option-type/value CRUD.

## Third course correction: shop-wide reusable option library (read this first too)

**Status: implemented in code** (same `0011` migration as the second
correction above, per the "Combined migration plan" below — not yet run
against the live DB). Second owner-requested rework, layered on top of the
second correction above (they're independent of each other but happen to
touch the same tables, so their migrations are planned together — see
"Combined migration plan" below).

**The ask:** option types/values currently belong to one product each —
today's `product_option_types` row for "Color" on the Weekender Tote is a
totally separate row from "Color" on the Card Wallet, with its own value
list, even though in practice they'd usually list the same colors. The
owner wants to define "Color: Blue, Red, Green" **once**, shop-wide, and
attach it to any product that needs it — not recreate the same option
type/value list by hand on every product.

**Design decisions, per the owner's answers:**
1. **Per-product value subset.** Attaching a shared option type to a
   product doesn't automatically expose every value that type has ever
   had — the admin picks which subset applies to *this* product (e.g. the
   shop-wide Color list has Blue/Red/Green, but the Card Wallet only comes
   in Blue/Red). Needs a join table between a product's attached option
   and the specific values it offers, not just a product-to-type link.
2. **`display_style` is global on the option type**, not per-product.
   Setting Color to swatch buttons applies everywhere Color is attached,
   full stop — no per-product override. (Down side, accepted: a type used
   on both a 3-color product and a 12-color product renders identically on
   both, even if a dropdown would read better on the 12-color one. Revisit
   if that turns out to matter in practice.)
3. **One-off, product-specific types are still possible, with no schema
   distinction.** Because there's a single shop-wide `option_types` table,
   creating a new type from inside a product's page still just inserts a
   row there — it's automatically reusable later even if only one product
   uses it today. "Allow both" doesn't need special-casing: the only
   difference is a UI convenience (create-new vs. attach-existing), not a
   data model split between "shared" and "private" types.

**Schema** (replaces `product_option_types`/`product_option_values` from
migration `0009`):

```sql
-- Shop-wide, reusable across every product.
create table option_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,           -- "Color", "Thread Color", "Size"
  display_style text not null default 'buttons'
    check (display_style in ('buttons', 'dropdown')),
  created_at timestamptz not null default now()
);

create table option_values (
  id uuid primary key default gen_random_uuid(),
  option_type_id uuid not null references option_types(id) on delete cascade,
  value text not null,                 -- "Black", "Natural Thread"
  position integer not null default 0, -- shop-wide display order
  created_at timestamptz not null default now(),
  unique (option_type_id, value)
);

-- Which option types a given product uses, and in what order.
create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  option_type_id uuid not null references option_types(id) on delete cascade,
  position integer not null default 0,
  unique (product_id, option_type_id)
);

-- The per-product subset of that type's values this product actually
-- offers. No DB constraint enforces that option_value_id belongs to the
-- same option_type_id as its product_options row — checked in app code,
-- same posture as the existing "no duplicate variant combination" check
-- in src/lib/admin/catalog.ts.
create table product_option_selections (
  product_option_id uuid not null references product_options(id) on delete cascade,
  option_value_id uuid not null references option_values(id) on delete cascade,
  primary key (product_option_id, option_value_id)
);
```

Deliberately named `product_option_selections`, not a reused
`product_option_values`, to avoid a same-name-different-shape collision
with the table being dropped in the same migration.

**Renaming/deleting a shared type or value is shop-wide by design** — that
*is* the point of reuse. Renaming "Color" to "Colour" changes it
everywhere; deleting the "Green" value removes it from every product that
had it selected (cascades `product_option_selections`). Existing orders
are never affected either way, since `order_item_options` (second
correction above) snapshots plain text at order time, not a live FK. The
admin delete-confirmation copy should say so explicitly (e.g. "Delete this
option type? This removes it from every product using it," vs. today's
narrower "removes it from any variants using it") so a rename/delete on
the library page doesn't surprise the admin by silently changing an
unrelated product's PDP.

**Code touchpoints:**
- **`src/lib/admin/catalog.ts`** — today's product-scoped
  `createOptionType`/`updateOptionType`/`deleteOptionType`/
  `createOptionValue`/`updateOptionValue`/`deleteOptionValue` become
  shop-wide (`listOptionTypes`, still `createOptionType(name,
  displayStyle)` etc., just no longer take a `productId`). New
  product-scoped functions: `attachOptionToProduct(productId,
  optionTypeId, valueIds)`, `updateProductOptionSelection(productOptionId,
  valueIds)`, `detachOptionFromProduct(productOptionId)` (detach only —
  doesn't touch the shared type/value rows). `getProductForAdmin` returns
  each attached option as `{ productOptionId, optionTypeId, name,
  displayStyle, allValues: {id, value, position}[], selectedValueIds:
  string[] }` so the UI can render a checkbox per available value.
- **New admin page, `/admin/options`** — the shared library: list/create/
  rename/delete option types, and per type, list/add/rename/delete its
  values. Same list-CRUD shape as the existing FAQ-items page.
- **`src/app/admin/products/[id]/page.tsx`'s Options section** reworked:
  "Attach an option" picks from `option_types` not yet attached to this
  product (plus a "create new type" shortcut that both adds it to the
  library and auto-attaches it here); each attached option renders as its
  name/display-style (read-only here, edited on `/admin/options`) plus a
  checkbox per `allValues` entry to set this product's `selectedValueIds`,
  plus a detach button.
- **`src/lib/products.ts`** (public catalog) — `PRODUCT_SELECT` joins
  through `product_options` → `option_types` and
  `product_option_selections` → `option_values` instead of directly
  through `product_option_types`/`product_option_values`, filtered to
  each product's own attached options/selected values. The resulting
  `ProductOptionType[]` shape handed to the PDP is **unchanged** (`{ id,
  name, displayStyle, values: string[] }`) — `ProductDetail.tsx` and the
  cart/checkout option-selection logic need **no changes** for this
  correction; only where the data comes from changes.
- Tests (`tests/admin-catalog-options.test.ts` and friends) reworked for
  the new library/attach/detach functions and the subset-selection shape.

**Combined migration plan** — written as
`supabase/migrations/0011_option_library_and_order_item_options.sql`, run
after `0010` (not yet run against the live DB, see `MANUAL_TASKS.md`).
`product_option_types`/`product_option_values` are already live, so this
can't be folded into `0010` the way the second correction's own pieces can.
Since both this correction and the second one need to read through the
current `product_variant_options` →`product_option_values` →
`product_option_types` chain before dropping anything, both are done in the
same file, in this order:
1. Create `option_types`, `option_values`, `product_options`,
   `product_option_selections`, and `order_item_options` (second
   correction).
2. Backfill `order_item_options` from `order_items.variant_id` →
   `product_variants` → `product_variant_options` → (still-live)
   `product_option_values` → `product_option_types` (second correction).
3. Backfill the shared library: group existing `product_option_types` rows
   by `name` (exact text match) into one `option_types` row per distinct
   name — today's design gave every product its own "Color"/"Size"/... row
   (migration `0009`), so in practice this merges same-named rows across
   products into one. Union each group's `product_option_values.value`
   (dedup by exact text, order preserved via `min(position)`) into
   `option_values` under the merged type. For each original
   `(product_id, product_option_type)` pair, insert a `product_options`
   row (preserving its original `position`) and a
   `product_option_selections` row per its original
   `product_option_values` rows, matched to the corresponding merged
   `option_values` row by value text.
   - **Call out for manual review:** if two products had set different
     `display_style` for a same-named type (possible after `0010` ships,
     since that's currently per-product), the merge has to pick one — take
     the majority value (ties: either). Flag this in `MANUAL_TASKS.md` as
     a post-migration "verify option display styles still look right"
     check, since it's now possible for a product's rendering to visibly
     change.
4. Drop `order_items.variant_id`/`variant_label` (second correction).
5. Drop `product_variants`, `product_variant_options`,
   `product_option_types`, `product_option_values` (old shape) — in that
   order, since the first two reference the second two.

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

1. ~~**No DB-level uniqueness on "no two variants share the same
   combination"**~~ — **moot.** There's no variant row to dedup anymore
   once the second course correction ships; every combination of a
   product's own option values is valid by construction.
2. ~~**Variant combinations are immutable after creation.**~~ — **moot**,
   same reason as 1: nothing is "created" — a combination is just
   whatever the shopper picks at order time.
3. ~~**No per-swatch cross-dimension stock awareness**~~ — **superseded,
   and no longer needed.** This whole problem (whether "Black" should be
   disabled depending on what's picked for other dimensions, or showing a
   "not available in this combination" message) only existed because
   stock was per-variant. With stock per-product, availability is a
   single fact for the whole product — every option combination is
   either all orderable or all sold out together. No swatch-disabling
   logic needed at all.
4. ~~**Manual variant creation, not auto-generated combinations**~~ —
   **superseded by the second course correction above.** The original
   choice here (admin explicitly creates each sellable combination,
   rejecting auto-generating the full cartesian product) assumed
   combinations needed an admin-side gate at all. They don't: with stock
   per-product, there's no reason a customer-picked combination the admin
   never explicitly "created" should be blocked. There's now no variant
   creation step, manual or auto-generated, at all.
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

**All of checkpoints 0-9 are done (code)** on this branch
(`feat/product-options`). **Not yet merged to `develop`** — blocked only on
running migrations `0010_product_level_stock.sql` then
`0011_option_library_and_order_item_options.sql` against the live DB, in
that order, and live-verifying them (see `MANUAL_TASKS.md`), since every
prior migration in this project has needed a human to run it via the
Supabase SQL editor.

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
8. **Second course correction (drop variants entirely). Done (code)**,
   migration `0011` not yet run live. `createVariant`/`deleteVariant`/
   `DuplicateVariantError` and the admin Variants section are gone;
   `products.ts`/PDP use `selectedOptions`-only (no variant matching);
   `CartItem.variantId` became `CartItem.selectedOptions` (identity is
   `slug` + a sorted serialization); `orders.ts`/the API route use
   `order_item_options` instead of `variant_id`/`variant_label`;
   `InsufficientStockError` dropped its `variantLabel` param;
   email/admin-orders/account now format "Type: Value" display strings via
   `formatItemOptions`/`formatSelectedOptions`.
9. **Third course correction (shop-wide reusable option library). Done
   (code)**, same migration `0011`. `src/lib/admin/catalog.ts` gained
   `listOptionTypes`/`createOptionType`/`updateOptionType`/
   `deleteOptionType`/`createOptionValue`/`updateOptionValue`/
   `deleteOptionValue` (all shop-wide now, no `productId` param) plus
   `attachOptionToProduct`/`updateProductOptionSelection`/
   `detachOptionFromProduct`; new `/admin/options` library page (list/
   create/rename/delete types and values, same list-CRUD pattern as the FAQ
   page); the product page's Options section reworked to attach/detach +
   a checkbox per value; `products.ts`'s `PRODUCT_SELECT` joins through
   `product_options`/`option_types`/`product_option_selections`/
   `option_values` instead of the old per-product tables (the
   `ProductOptionType[]` shape handed to the PDP is unchanged, as designed
   — no PDP/cart changes needed for this correction specifically).

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm test` after each checkpoint.
- Live-verify the migration preserves existing wallet/tote variants and
  historical order display (read-only script against the dev DB).
- Manual browser session for the admin Options/Variants UI and the PDP's
  multi-dimension swatch selection (can't be curl-verified).
- For checkpoints 8/9 (combined migration): live-verify `order_item_options`
  is correctly backfilled from existing `product_variant_options` and the
  shared `option_types`/`option_values`/`product_options`/
  `product_option_selections` are correctly backfilled from existing
  per-product `product_option_types`/`product_option_values` (read-only
  script against the dev DB, same as above, checking merged-by-name types
  and preserved per-product value subsets) before those old tables are
  dropped. Manual browser session confirming: every combination of a
  product's own option values is addable to cart (not just
  previously-admin-created ones); attaching a shared option type (e.g.
  Color) to a second product shows only that product's selected value
  subset, not every value the type has shop-wide; renaming a value on
  `/admin/options` updates every product using it; and the placed order's
  option selections display correctly in the admin order list,
  order-confirmation email, and `/account` order history.
