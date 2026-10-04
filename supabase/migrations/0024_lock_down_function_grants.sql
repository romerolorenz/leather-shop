-- Lock down execute on the remaining database functions, and make future
-- functions start locked — see docs/IMPROVEMENTS.md (Done: "Security: lock
-- down execute permissions on older database functions").
--
-- Why: Postgres grants EXECUTE on every new function to PUBLIC, and
-- Supabase additionally grants it to anon/authenticated in the public
-- schema. These functions were created without a revoke, so the public anon
-- key (shipped to the browser) could call them via /rest/v1/rpc/...:
--   decrement_product_stock, restore_product_stock  (0010)
--   redeem_promo_code                               (0015, replaced in 0016)
-- Confirmed against dev before this migration. It wasn't exploitable in
-- practice: all three are SECURITY INVOKER and every table is RLS
-- default-deny (0001_init.sql), so anon's UPDATE/INSERT inside them matched
-- zero rows. But that's one policy or one `security definer` away from
-- anyone zeroing stock or burning promo codes, so close it at the grant
-- level too, same as set_setting() (0023).
--
-- Only the server calls these, via the service-role client
-- (src/lib/orders.ts, src/lib/promo-codes.ts). No browser code uses .rpc().
--
-- 0002's decrement/restore_variant_stock are not handled here: 0010
-- already dropped them, and tests/db-function-permissions.test.ts confirms
-- they no longer exist.

revoke execute on function decrement_product_stock(uuid, integer) from public, anon, authenticated;
grant execute on function decrement_product_stock(uuid, integer) to service_role;

revoke execute on function restore_product_stock(uuid, integer) from public, anon, authenticated;
grant execute on function restore_product_stock(uuid, integer) to service_role;

revoke execute on function redeem_promo_code(uuid, text, uuid) from public, anon, authenticated;
grant execute on function redeem_promo_code(uuid, text, uuid) to service_role;

-- ─── future functions start locked ────────────────────────────────────────
-- Default privileges apply to functions created later by the named role.
-- Migrations here are run in the Supabase SQL editor, which runs as
-- `postgres`, hence `for role postgres`.
--
-- Two statements, because PUBLIC's execute grant is a *global* default:
-- Postgres can't revoke a global default per-schema (a per-schema revoke
-- only undoes a per-schema grant). So:
--   1. per-schema: undo Supabase's own `in schema public` grant to
--      anon/authenticated;
--   2. global: drop the built-in PUBLIC grant (anon inherits PUBLIC, so
--      without this, step 1 alone would change nothing in practice).
-- service_role keeps execute through Supabase's per-schema default grant,
-- re-stated in step 3 so it can't depend on that.
--
-- Trade-off: any future function that the browser or an RLS policy must
-- call (e.g. an is_admin() helper used in a policy) needs an explicit
-- `grant execute ... to anon/authenticated`. That's the intent: exposure
-- becomes opt-in. Supabase's own functions (auth, storage, realtime) are
-- owned by other roles and unaffected; so is anything that already exists.

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
