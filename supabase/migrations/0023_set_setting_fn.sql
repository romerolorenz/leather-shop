-- set_setting(key, value): writes one settings row, storing a JSON null
-- (not SQL NULL) when the value is null.
--
-- Why: updateSettings() (src/lib/settings.ts) writes through PostgREST,
-- which turns a JS `null` for a jsonb column into SQL NULL. settings.value
-- is NOT NULL, so clearing an image URL (studio photo, portrait, hero)
-- failed with a not-null violation. updateSettings() routes null values
-- through this function instead; non-null values still use a plain update.
--
-- Raises if the key doesn't exist, so a missing seed row fails loudly
-- instead of silently saving nothing.
--
-- Only the server (service-role key) may call it: Supabase grants execute
-- on new public functions to anon/authenticated by default, and settings
-- must not be writable from the browser.

create or replace function set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
as $$
begin
  update settings
     set value = coalesce(p_value, 'null'::jsonb),
         updated_at = now()
   where key = p_key;

  if not found then
    raise exception 'Unknown setting: %', p_key;
  end if;
end;
$$;

revoke execute on function set_setting(text, jsonb) from public, anon, authenticated;
grant execute on function set_setting(text, jsonb) to service_role;
