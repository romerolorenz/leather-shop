-- Phase 7: FAQ page (admin-editable) + Contact Us settings.
-- See docs/PRODUCT_REQUIREMENTS.md §6 (Storefront: FAQ page, Contact Us
-- page) and docs/DEVELOPMENT_PLAN.md Phase 7.

create table faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table faq_items enable row level security;
-- Default-deny, same reasoning as the other tables (0001_init.sql):
-- only the service-role key (server-only) reads/writes this table.

-- Contact Us page content — configurable, not hardcoded (CLAUDE.md rule).
-- Placeholder values; update via /admin/settings once real brand assets
-- exist (PRD §1 notes v1 has none yet).
insert into settings (key, value) values
  ('contact_email', '"hello@example.com"'),
  ('contact_instagram_url', '"https://instagram.com/yourshop"');

-- Starter FAQ content matching the topics PRD §6 calls for.
insert into faq_items (question, answer, position) values
  (
    'Where do you deliver?',
    'We currently deliver to Metro Manila only, flat rate ₱150. Outside Metro Manila? Reach out via our Contact page and we''ll see what we can do.',
    0
  ),
  (
    'How do I pay?',
    'Payment is handled manually for now — bank transfer, GCash, or Maya. After you place an order, we''ll reach out with instructions.',
    1
  ),
  (
    'How long until my order ships?',
    'Lead time varies per product and is shown on each product page. In-stock items ship faster; made-to-order items take longer since they''re produced after you order.',
    2
  ),
  (
    'How do I care for my leather goods?',
    'Keep leather away from prolonged direct sunlight and moisture. Wipe with a soft, dry cloth, and condition occasionally with a leather-safe conditioner to keep it supple.',
    3
  ),
  (
    'What''s your return policy?',
    'We accept returns or exchanges only for defective items. We don''t accept returns for change of mind, or for made-to-order items produced correctly to your chosen options.',
    4
  );
