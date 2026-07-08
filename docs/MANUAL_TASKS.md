# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks — next-phase blockers first, then later-phase
blockers, then items that don't block any phase.

- [ ] **Go-live blocker, not a phase blocker: verify a domain on Resend.**
  Confirmed live: the sandbox sender (`onboarding@resend.dev`) can only
  send to your own account email (`marcolorenzoromero@gmail.com`) — it
  rejected even a `+alias` of that same address. This means **customer
  order-confirmation emails currently cannot reach any real customer**,
  only you. Same restriction now also blocks the new `/contact` form (adds
  a direct-email option alongside mailto/Instagram) — a message to any
  address but your own will fail with a "couldn't send" error until this
  is fixed. Code/tests are otherwise done (Phase 6). Verify a domain at
  resend.com/domains and set `RESEND_FROM_EMAIL` to an address on it
  before real customers place orders.
- [ ] **Doesn't block any phase: update the placeholder Contact Us email.**
  `/admin/settings`'s "Contact Us email" is still `marco@example.com` (set
  during Phase 7 testing) — the new `/contact` form sends there, so it
  needs to be a real inbox you check before the form is useful.
- [ ] **Doesn't block any phase: set the real Instagram handle.**
  `/admin/settings`'s new "Contact Us Instagram handle" field is still the
  placeholder `@yourshop` (migration `0008_contact_instagram_handle.sql`
  is run — this is just setting the real value) — update it via
  `/admin/settings` so `/contact` shows the actual handle instead of the
  placeholder.
- [ ] **Doesn't block any phase: provide real brand assets** (logo, color
  palette, final copy) — PRD §1 notes v1 is intentionally using
  placeholders.

## Done

- [x] Create the Supabase project.
- [x] Run `supabase/migrations/0001_init.sql` against it.
- [x] Rotate the Supabase database password.
- [x] Run `supabase/migrations/0002_stock_functions.sql` against it.
- [x] Set `CRON_SECRET` locally (generated automatically for testing —
  still need to set the same value in Vercel's env vars on deploy).
- [x] Decide on Facebook login — Google-only, no Facebook.
- [x] Set up Google OAuth for Supabase Auth (Google Cloud Console client +
  Supabase provider config).
- [x] Run `supabase/migrations/0003_admin_users.sql` against it.
- [x] Verify the live login flow: allow-listed email reaches `/admin`,
  a different Google account gets denied.
- [x] Run `supabase/migrations/0004_product_photos.sql` against it.
- [x] Run `supabase/migrations/0005_product_photo_gallery.sql` against it.
- [x] Set `RESEND_API_KEY` in `.env.local`.
- [x] Verify both order emails live: admin notification and customer
  confirmation (with HTML formatting + product photo) both actually
  arrived, sent to `marcolorenzoromero@gmail.com`.
- [x] Upload real product photos — done via the admin UI during testing.
- [x] Run `supabase/migrations/0006_faq_and_contact.sql` against it.
- [x] Run `supabase/migrations/0007_customer_addresses.sql` against it.
- [x] Push the repo to GitHub (`https://github.com/romerolorenz/leather-shop`, private, `develop` branch).
- [x] Deploy to Vercel — env vars set, `NEXT_PUBLIC_SITE_URL` pointed at
  the production domain, Supabase Auth redirect URLs updated, Cron job
  live on the daily schedule.
- [x] Mobile-device walkthrough (Phase 9 exit criteria): full browse →
  cart → checkout → place order flow, plus Google login → `/account` →
  `/account/addresses`, both verified working on a real device.
- [x] Fix local Google login redirecting without creating a session —
  Supabase's Redirect URLs list needs a wildcard (`http://localhost:3000/**`),
  not just the exact `/auth/callback` path, since the app's requested
  `redirectTo` includes a `?next=...` query string that didn't match the
  non-wildcard entry.
- [x] Run `supabase/migrations/0008_contact_instagram_handle.sql` against it.
- [x] Run `supabase/migrations/0009_product_options.sql` against it —
  verified live: existing variants correctly migrated to a "Color" option
  type per product, `product_variants.label` dropped, historical
  `order_items.variant_label` backfilled.
