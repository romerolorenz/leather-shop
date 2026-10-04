import { getSupabaseServerClient } from "@/lib/supabase/server";

// Raw snapshot/restore of `settings` rows for tests that mutate settings.
// Deliberately bypasses updateSettings()/getSettings() (the code under
// test), so a bug there can't leave test data behind in the dev DB.

export type SettingsRow = { key: string; value: unknown };

export async function snapshotSettings(keys: string[]): Promise<SettingsRow[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("settings")
    .select("key, value")
    .in("key", keys)
    .order("key");
  if (error) throw error;
  if (data.length !== keys.length) {
    const missing = keys.filter((k) => !data.some((row) => row.key === k));
    throw new Error(`Missing settings rows: ${missing.join(", ")}`);
  }
  return data;
}

// Writes each row's exact jsonb value back. A JSON-null value can't go
// through a plain PostgREST update (it becomes SQL NULL and violates
// settings.value NOT NULL), so those go through set_setting()
// (migration 0023) — the one piece of DB code this shares with the app.
export async function restoreSettings(rows: SettingsRow[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  const errors: unknown[] = [];
  for (const { key, value } of rows) {
    const { error } =
      value === null
        ? await supabase.rpc("set_setting", { p_key: key, p_value: null })
        : await supabase.from("settings").update({ value }).eq("key", key);
    if (error) errors.push(error);
  }
  // Attempt every row before failing, so one bad row doesn't strand the rest.
  if (errors.length) {
    throw new Error(`restoreSettings failed: ${JSON.stringify(errors)}`);
  }
}

// Fails fast (before any mutation) if set_setting() isn't installed yet,
// since restoreSettings() couldn't put a JSON null back without it.
// Re-writes the row's current value, so it changes nothing.
export async function assertSetSettingInstalled(): Promise<void> {
  const supabase = getSupabaseServerClient();
  const [row] = await snapshotSettings(["homepage_studio_image_url"]);
  const { error } = await supabase.rpc("set_setting", {
    p_key: row.key,
    p_value: row.value,
  });
  if (error) {
    throw new Error(
      `set_setting() unavailable — run supabase/migrations/0023_set_setting_fn.sql first (${error.message})`
    );
  }
}
