import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setPositions } from "@/lib/admin/reorder";
import { resolveUploadedImageUrl } from "@/lib/admin/image-uploads";

// Admin-editable, shop-wide payment info shown on the "Send payment
// details" email (docs/IMPROVEMENTS.md) — see
// supabase/migrations/0019_payment_methods.sql +
// 0020_payment_methods_drop_type.sql. One flat, admin-orderable list — no
// bank-vs-e-wallet distinction (course correction; the table originally
// had a `type` column, dropped in 0020 since it turned out not to matter).
// Each entry can carry its own QR image, since one entry's QR (if it has
// one at all) is independent of another's — QR upload is per-row, unlike
// the single shared hero image.

export type PaymentMethod = {
  id: string;
  label: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
  position: number;
};

type PaymentMethodRow = {
  id: string;
  label: string;
  account_name: string;
  account_number: string;
  qr_image_url: string | null;
  position: number;
};

function mapRow(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    label: row.label,
    accountName: row.account_name,
    accountNumber: row.account_number,
    qrImageUrl: row.qr_image_url,
    position: row.position,
  };
}

const PAYMENT_METHOD_SELECT =
  "id, label, account_name, account_number, qr_image_url, position";

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select(PAYMENT_METHOD_SELECT)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data as PaymentMethodRow[]).map(mapRow);
}

export type PaymentMethodInput = {
  label: string;
  accountName: string;
  accountNumber: string;
};

export async function createPaymentMethod(
  input: PaymentMethodInput
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("payment_methods")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      label: input.label,
      account_name: input.accountName,
      account_number: input.accountNumber,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function updatePaymentMethod(
  id: string,
  input: PaymentMethodInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({
      label: input.label,
      account_name: input.accountName,
      account_number: input.accountNumber,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderPaymentMethods(orderedIds: string[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  await setPositions(supabase, "payment_methods", {}, "id", "position", orderedIds);
}

// QR images live in the same standalone `site-images` bucket as the hero
// and are uploaded browser → Storage directly (src/lib/admin/image-uploads.ts);
// this validates the uploaded path and persists its public URL onto this
// specific payment_methods row (not a shared settings value) — each
// entry's QR is independent.
export async function setPaymentMethodQrImageFromUpload(
  id: string,
  path: string
): Promise<string> {
  const publicUrl = await resolveUploadedImageUrl({ kind: "payment-qr" }, path);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({ qr_image_url: publicUrl })
    .eq("id", id);
  if (error) throw error;

  return publicUrl;
}
