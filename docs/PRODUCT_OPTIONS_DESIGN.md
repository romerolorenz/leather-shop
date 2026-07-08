# Product Options Design

Design doc for the "Product options beyond color" item in
[IMPROVEMENTS.md](./IMPROVEMENTS.md). Written before implementation per the
project's own rule of documenting non-trivial architecture changes ahead of
building them (see [ARCHITECTURE.md](./ARCHITECTURE.md),
[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)).

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

`decrement_variant_stock`/`restore_variant_stock` (0002) need **no
changes** — both still key off a single `variant_id` row; stock stays
per-variant regardless of how many option dimensions compose it.

## Design decisions

1. **No DB-level uniqueness on "no two variants share the same
   combination"** — `product_variant_options` can't express that as a
   simple constraint. Enforced in app code instead. Fine at this scale
   (a handful of products, a few option types each).
2. **Variant combinations are immutable after creation** — only
   `stock_quantity` is editable inline afterward. To change a combination,
   delete and re-add. Avoids collision-handling complexity for in-place
   combination edits.
3. **No per-swatch cross-dimension stock awareness** — a single-dimension
   color swatch can be unambiguously disabled when out of stock; with N
   dimensions, whether "Black" should be disabled depends on what's
   selected for the other dimensions too. Simplification: never disable
   individual swatches; once all dimensions are picked, if no matching
   variant exists or it's out of stock, show an inline "not available in
   this combination" message and disable Add to Cart (same pattern as
   today's `!orderingEnabled` state).
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
  `createOptionValue`, `updateOptionValue`, `deleteOptionValue`), reworked
  variant CRUD (`createVariant(productId, optionValueIds, stockQuantity)`
  replaces label-based `addVariant`; `updateVariantStock` replaces
  `updateVariant`). `getProductForAdmin` returns `optionTypes` + each
  variant's composed `label`/`optionValueIds`.
- **`src/app/admin/actions.ts`** — new Server Actions following the
  existing `runAction()`/`ActionResult` pattern.
- **`src/app/admin/products/[id]/page.tsx`** — new "Options" section
  (list-CRUD matching the existing FAQ-item pattern), reworked "Variants"
  section (read-only option values + editable stock per row; "Add variant"
  becomes one `<select>` per option type instead of a label input).
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

1. Migration + live-DB verification.
2. Admin lib layer (option-type/value CRUD, reworked variant CRUD) +
   Server Actions.
3. Admin UI (Options section, reworked Variants section).
4. Public `products.ts` + PDP rework.
5. Cart/checkout/orders/email rename + rework.
6. Tests: update existing fixtures (`tests/orders.test.ts`,
   `tests/api-orders.test.ts`, `tests/email.test.ts`) to the new
   `variantId`/`variantLabel` shape; new tests for option-type/value CRUD
   and duplicate-combination rejection.
7. Docs: this file stays as the design record; `ARCHITECTURE.md`'s data
   model section gets the new tables; `IMPROVEMENTS.md` entry moves to
   Done; `MANUAL_TASKS.md`/`MANUAL_TESTING.md` get the migration-run and
   browser-verification checklist items.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm test` after each checkpoint.
- Live-verify the migration preserves existing wallet/tote variants and
  historical order display (read-only script against the dev DB).
- Manual browser session for the admin Options/Variants UI and the PDP's
  multi-dimension swatch selection (can't be curl-verified).
