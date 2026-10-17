# Storefront Buttons: Pills to 2px Rectangles

**Status:** Approved by the owner, 2026-10-17: the shape (2px corner),
the scope (customer-facing only), the uppercase tracked label style, and
the decisions below. No mockup. Being built on `design/buy-now`
together with [buy-now.md](buy-now.md).

The variants, classes and states live in
[STYLE_GUIDE.md § Buttons](STYLE_GUIDE.md#buttons). This file is only
the rollout inventory for the developer. The product page's new Buy now
and Add to cart pair is specified in [buy-now.md](buy-now.md). Build the
two together.

**Scope:** `src/app/**` and `src/components/**`, excluding
`src/app/admin/**` and `src/components/admin/**`. Line numbers are as of
2026-10-17 on `design/buy-now`.

## Step 0: the token

| File | Change |
|---|---|
| `src/app/globals.css` | Add `@theme { --radius-btn: 2px; }` (or add the line to the existing `@theme inline` block). This gives `rounded-btn`. Changing it to `0` later makes everything square. |
| `src/components/UnavailableTag.tsx:8` | `rounded-[2px]` → `rounded-btn` (keeps the sold-out tag in step with buttons; the visual result is the same) |

## Sweep by page

Every change below is the same: swap the pill classes for the STYLE_GUIDE
base, size and variant classes. That means dropping `rounded-full`,
`py-*` and `text-sm`, and adding `rounded-btn`, `h-12` or `h-10`, and the
uppercase label recipe.

| # | Page | File:line | Element | Today | Becomes |
|---|---|---|---|---|---|
| 1 | Home | `src/app/page.tsx:133` | "Shop the Collection" hero link | Ghost pill | **Ghost on photo**, Default (`h-12`). The label style is already uppercase. |
| 2 | Product page | `src/app/products/[slug]/ProductDetail.tsx:148` | "Add to cart" | Ink pill | **Primary** Buy now + **Secondary** Add to cart + status block, per [buy-now.md](buy-now.md) |
| 3 | Cart | `src/app/cart/CartView.tsx:191` | "Checkout" `<Link>` | Ink pill | **Primary**, Default, `w-full` |
| 4 | Cart and Checkout | `src/components/PromoCodeField.tsx:142` | "Apply" / "Applying…" | Hairline-outline pill | **Secondary**, Compact (`h-10`) |
| 5 | Checkout | `src/app/checkout/CheckoutForm.tsx:466` | "Place order" / "Placing order..." | Ink pill | **Primary**, Default, `w-full`, plus the pending rule (`aria-busy`, full strength). Fix the copy to "Placing order…" with a single ellipsis character. |
| 6 | Contact | `src/app/contact/ContactForm.tsx:94` | "Send message" / "Sending..." | Ink pill | **Primary**, Default, `w-full`, plus the pending rule. Fix the copy to "Sending…". |
| 7 | Login | `src/app/login/LoginForm.tsx:42` | "Sign in with Google" | Ink pill | **Primary**, Default (see Decision 4: shared with the admin login) |
| 8 | Account › Addresses | `src/app/account/addresses/AddressFormModal.tsx:50` | "+ Add address" trigger | Hairline-outline pill | **Secondary**, Compact |
| 9 | Address modal | `AddressFormModal.tsx:187` | "Cancel" | Hairline-outline pill | **Secondary**, Compact |
| 10 | Address modal | `AddressFormModal.tsx:193` | Save / submit label | Ink pill | **Primary**, Compact |

**Totals:** 8 files with button changes, plus `globals.css` (token) and
`UnavailableTag.tsx` (token swap), so **10 files**. That covers **10
existing buttons**, plus 1 new button (Buy now) and 1 new status block
on the product page.

### Optional polish in the same pass (recommended, small)

| File:line | Element | Suggestion |
|---|---|---|
| `src/app/layout.tsx:39` | "Skip to content" link (shown on focus) | `focus:rounded-md` → `focus:rounded-btn`, so it matches the new buttons when it appears |
| `src/app/account/layout.tsx:21` | "Sign out" (plain `underline` in zinc text) | Use the **Text link** inline style (STYLE_GUIDE), which also fixes its unstyled look |
| `src/app/page.tsx:95` | Studio "Learn more" text link | Add `py-3` (or `inline-block` padding) so the tap height reaches 44px on mobile |

### Checked and left alone

- **Already text links:** cart empty state ("Browse the collection"),
  checkout's `ACCENT_LINK` links, the account page links, Breadcrumbs,
  and PromoCodeField's "Remove".
- **Icon-only buttons (keep `rounded-md`):** cart "Remove item"
  (`CartView.tsx:137`), address edit and close (`AddressFormModal.tsx:59`,
  `:90`), address delete (`account/addresses/page.tsx:82`), and the
  SiteHeader icon links.
- **Round on purpose:** Studio portrait (`page.tsx:71`), cart-count badge
  (`CartLink.tsx:30`), the checkout address radio dot
  (`CheckoutForm.tsx:498`).
- **Not buttons:** form fields (`rounded-md`), the modal box, toasts and
  tooltips.
- **No cart drawer exists.** The header only has icon links, so nothing
  changes there.

## Decisions (owner, 2026-10-17)

The rule: **every rectangular storefront element uses the same 2px corner
(`rounded-btn`), and only things that are meant to be circles stay round.**

1. **Option value pills** (`ProductDetail.tsx:127`): yes, they become
   `rounded-btn`. They keep sentence case, since they're values and not
   actions.
2. **Cart quantity stepper** (`CartView.tsx:100`): yes, it becomes
   `rounded-btn`.
3. **Form fields:** yes, they move to `rounded-btn` in this pass:
   `CheckoutForm.tsx` `FIELD_CLASS`, `ContactForm.tsx`,
   `AddressFormModal.tsx`, `PromoCodeField.tsx`, and `ProductDetail.tsx`'s
   dropdown.
4. **`/login` is shared with the admin login:** accepted. The admin
   sign-in button changes too.
5. **Checkout address cards** (`CheckoutForm.tsx:324`, `:491`): yes,
   they become `rounded-btn` as well. The owner went with the "same
   corner everywhere" rule over the designer's leave-as-is suggestion.

The optional polish items above are in scope too: the skip link's
corner, "Sign out" as a text link, and the "Learn more" tap height.

## Acceptance checks

- No `rounded-full` remains on any button or button-like link in scope
  (`grep -rn rounded-full src/app src/components`, ignoring admin, should
  list only the portrait, the badge, and the radio dot. Decisions 1–2 made the option pills
  and the stepper rectangular.
- Every in-scope button shows an uppercase, tracked label at 12px on
  mobile and 14px from `sm`. The source strings stay in sentence case.
- Default buttons are 48px tall and compact ones 40px, whether they're a
  `<button>` or a `<Link>`.
- Keyboard focus shows a 2px outline with a 2px offset on every variant:
  ink on paper, white on the hero.
- Pending buttons (Place order, Send message, Apply, Buy now) keep their
  label at full strength and ignore a second tap.
- Setting `--radius-btn: 0` in `globals.css` makes every storefront
  button square, with no other edits.
- The admin pages look unchanged.
