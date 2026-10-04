-- Homepage Studio section: studio photo + maker profile (Variant 3,
-- flexible). See docs/design/studio-profile.md (approved 2026-10-04).
--
-- The studio photo and optional portrait upload to the existing
-- `site-images` bucket (created in 0013) under the `studio-` and
-- `studio-portrait-` prefixes — no bucket or table changes needed.
--
-- updateSettings() (src/lib/settings.ts) only updates rows that already
-- exist, so every new key is seeded here. Values are jsonb, encoded the
-- same way as 0013: JSON null for unset image URLs, bare numbers for the
-- focal point, JSON strings for text. Image URLs, alt text, quote and
-- name seed empty, so the homepage renders exactly as today until the
-- owner fills them in via /admin/homepage. `settings.key` is the primary
-- key (0001_init.sql), so `on conflict do nothing` makes this re-runnable.

insert into settings (key, value) values
  ('homepage_studio_image_url', 'null'),
  ('homepage_studio_focal_x', '50'),
  ('homepage_studio_focal_y', '50'),
  ('homepage_studio_image_alt', '""'),
  ('homepage_studio_portrait_url', 'null'),
  ('homepage_studio_quote', '""'),
  ('homepage_studio_name', '""'),
  ('homepage_studio_role', '"founder & leatherworker"')
on conflict (key) do nothing;
