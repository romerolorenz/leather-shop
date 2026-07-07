-- Product photo support for the admin catalog UI (Phase 5). Single photo
-- per product for v1 — matches docs/DEVELOPMENT_PLAN.md's stated scope ("photo
-- upload... referenced by URL on the product row"), not the full
-- multi-photo gallery PRD §5 describes as the eventual goal.

alter table products add column photo_url text;

-- Public bucket: product photos are shown on the public storefront, so
-- anonymous reads are fine. Writes only ever go through the admin upload
-- Server Action, which uses the service-role key (bypasses Storage RLS).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;
