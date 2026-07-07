# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks — next-phase blockers first, then later-phase
blockers, then items that don't block any phase.

- [x] **Blocks the multi-photo gallery follow-up (in progress): run
  `supabase/migrations/0005_product_photo_gallery.sql`** against the
  Supabase project (same SQL Editor flow as the earlier migrations) —
  replaces the single `photo_url` column with a `product_photos` table
  (migrates any existing photo automatically) and drops `photo_url`.
  Without it, admin/public product pages error (they now query
  `product_photos`, which doesn't exist yet).
- [ ] **Blocks Phase 6 (email loop) verification: set `RESEND_API_KEY` in
  `.env.local`.** Without it, order emails silently no-op with a console
  warning instead of actually sending. Get a key from
  [resend.com](https://resend.com).
- [ ] **Doesn't block any phase's build, but needed to go live: deploy to
  Vercel.** Connect the GitHub repo, and set all the `.env.local`
  variables (Supabase, Resend, `CRON_SECRET`) in the Vercel project's
  environment variable settings — they don't carry over automatically.
  This is also what makes `vercel.json`'s Cron entry for
  `/api/orders/expire` actually start firing (it's already correct code,
  just not running anywhere yet) — check whether your Vercel plan supports
  hourly frequency (some tiers restrict Cron to daily).
- [ ] **Doesn't block any phase: upload real product photos** to Supabase
  Storage. PDPs currently render an empty gray placeholder box — Phase 5
  builds the upload capability itself, so this can happen anytime after.
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
