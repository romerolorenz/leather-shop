-- Wipes all product/options/order test data. Destructive — run only
-- against the dev DB, and only when you're OK losing every product, order,
-- and shop-wide option currently in it. Pair with seed_test_data.sql to
-- repopulate afterward.
--
-- Deletes in dependency order (children before parents) rather than
-- relying on each table's ON DELETE config, so it works regardless of
-- cascade rules. Does NOT touch admin_users, faq_items,
-- customer_addresses, or settings — those aren't product/options/order
-- data.
--
-- Assumes migration 0011_option_library_and_order_item_options.sql has
-- run (option_types/option_values/product_options/
-- product_option_selections/order_item_options all exist).

delete from order_item_options;
delete from order_items;
delete from orders;

delete from product_option_selections;
delete from product_options;
delete from option_values;
delete from option_types;

delete from product_photos;
delete from products;
