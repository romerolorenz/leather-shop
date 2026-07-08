-- Admin can hide a product from the shop entirely — distinct from
-- ordering_enabled (which pauses ordering but still lists the product with
-- an "unavailable" state). A hidden product is excluded from the /products
-- listing and sitemap, and its PDP 404s directly; past orders referencing
-- it are unaffected (order history/photos resolve it regardless of
-- visibility — see src/lib/products.ts's getProductBySlug).

alter table products
  add column visible boolean not null default true;
