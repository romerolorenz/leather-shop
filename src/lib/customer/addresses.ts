import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  address2: string;
  barangay: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

export type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  address2: string;
  barangay: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  street: string;
  address2: string | null;
  barangay: string | null;
  city: string;
  postal_code: string | null;
  is_default: boolean;
};

function mapAddressRow(row: AddressRow): CustomerAddress {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    street: row.street,
    address2: row.address2 ?? "",
    barangay: row.barangay ?? "",
    city: row.city,
    postalCode: row.postal_code ?? "",
    isDefault: row.is_default,
  };
}

// customer_addresses has RLS with no policies (default-deny) — only the
// service-role key can read/write it, so every function here scopes to
// the caller's own user_email itself (enforced in app code, same pattern
// as admin_users). Callers must obtain user_email from assertCustomer(),
// never from user input.

export async function listAddresses(
  userEmail: string
): Promise<CustomerAddress[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select(
      "id, label, recipient_name, phone, street, address2, barangay, city, postal_code, is_default"
    )
    .eq("user_email", userEmail)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AddressRow[]).map(mapAddressRow);
}

export async function createAddress(
  userEmail: string,
  input: AddressInput
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (input.isDefault) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_email", userEmail);
  }

  const { error } = await supabase.from("customer_addresses").insert({
    user_email: userEmail,
    label: input.label,
    recipient_name: input.recipientName,
    phone: input.phone,
    street: input.street,
    address2: input.address2 || null,
    barangay: input.barangay,
    city: input.city,
    postal_code: input.postalCode,
    is_default: input.isDefault,
  });

  if (error) throw error;
}

export async function updateAddress(
  id: string,
  userEmail: string,
  input: AddressInput
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (input.isDefault) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_email", userEmail);
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update({
      label: input.label,
      recipient_name: input.recipientName,
      phone: input.phone,
      street: input.street,
      address2: input.address2 || null,
      barangay: input.barangay,
      city: input.city,
      postal_code: input.postalCode,
      is_default: input.isDefault,
    })
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) throw error;
}

export async function deleteAddress(
  id: string,
  userEmail: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) throw error;
}
