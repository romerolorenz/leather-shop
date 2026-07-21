-- "Product Details" section on the storefront PDP (docs/IMPROVEMENTS.md)
-- — two optional, admin-editable, free-form fields shown on a product's
-- page when set. Both nullable: a product with neither set shows no
-- "Product Details" section at all.

alter table products
  add column dimensions text,
  add column details text;
