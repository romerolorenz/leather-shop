-- Replaces the single photo_url column with a proper one-to-many gallery
-- (PRD §5 always described "multiple photos" as the goal; migration 0004
-- scoped to a single photo only for v1 simplicity — now expanding it).

create table product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_photos_product_id_idx on product_photos(product_id);

alter table product_photos enable row level security;
-- Default-deny, same reasoning as the other tables (0001_init.sql):
-- only the service-role key (server-only) reads/writes this table.

-- Carry over any existing single photo_url as the first (position 0) photo.
insert into product_photos (product_id, url, position)
select id, photo_url, 0
from products
where photo_url is not null;

alter table products drop column photo_url;
