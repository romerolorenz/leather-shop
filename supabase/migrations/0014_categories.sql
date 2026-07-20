-- Normalizes products.category (free-text) into a real table — a
-- prerequisite for promo codes' optional category restriction (see
-- docs/IMPROVEMENTS.md's "Promo code capability"). Internal-only: the
-- storefront keeps rendering a flat product grid unchanged; categories
-- exist purely so promo codes (and future admin tooling) reference a real
-- id instead of a typo-prone string.

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into categories (name)
select distinct category from products;

alter table products add column category_id uuid references categories(id);

update products set category_id = categories.id
from categories
where categories.name = products.category;

alter table products alter column category_id set not null;
alter table products drop column category;

alter table categories enable row level security;
