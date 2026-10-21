-- Category descriptions (docs/design/category-descriptions.md): an
-- optional short line the owner writes per category on /admin/categories,
-- shown under that category's heading on /products.
--
--   categories.description  plain text, nullable, at most 200 characters
--
-- Null means "no description": the shop shows just the heading, exactly as
-- before. No backfill, so the shop looks unchanged until the owner writes
-- one. The admin save (src/lib/admin/categories.ts) trims, collapses
-- whitespace/newlines to single spaces and stores blank as null; the check
-- below is the backstop for any other writer.
--
-- The 200-character limit is a layout-driven design constant, not a
-- business setting, so it lives here and in code rather than in the
-- settings table (the explicit exception CLAUDE.md asks for).
--
-- Re-runnable: the column is added if missing and the constraint is
-- dropped before it's (re)created.
--
-- Safe to run on prod BEFORE the code that uses it is deployed: it only
-- adds a nullable column, which the old code never selects or writes.

alter table categories add column if not exists description text;

alter table categories
  drop constraint if exists categories_description_length;

alter table categories
  add constraint categories_description_length
  check (description is null or char_length(description) <= 200);
