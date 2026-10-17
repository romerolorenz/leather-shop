import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAddressCodes, type AddressCodes } from "@/lib/psgc";

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  address2: string;
  // Display snapshot, taken from PSGC when the address was saved.
  barangay: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  // PSGC codes (migration 0025). Null only on rows saved before
  // nationwide delivery, which checkout doesn't offer (see
  // hasPsgcLocation).
  regionCode: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  barangayCode: string | null;
  isDefault: boolean;
};

// Location comes in as PSGC codes only. Names are always looked up from
// the codes server-side (never taken from the client) and snapshotted.
export type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  address2: string;
  postalCode: string;
  location: AddressCodes;
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
  province: string | null;
  region: string | null;
  postal_code: string | null;
  region_code: string | null;
  province_code: string | null;
  city_code: string | null;
  barangay_code: string | null;
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
    province: row.province ?? "",
    region: row.region ?? "",
    postalCode: row.postal_code ?? "",
    regionCode: row.region_code,
    provinceCode: row.province_code,
    cityCode: row.city_code,
    barangayCode: row.barangay_code,
    isDefault: row.is_default,
  };
}

// Checkout only offers saved addresses that carry PSGC codes, since an
// order needs a valid code chain. Rows saved before nationwide delivery
// have none; they still show in /account/addresses, where editing one
// means picking its location from the dropdowns. Production started with
// no such rows.
export function hasPsgcLocation(address: CustomerAddress): boolean {
  return !!address.regionCode && !!address.cityCode && !!address.barangayCode;
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
      "id, label, recipient_name, phone, street, address2, barangay, city, province, region, postal_code, region_code, province_code, city_code, barangay_code, is_default"
    )
    .eq("user_email", userEmail)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AddressRow[]).map(mapAddressRow);
}

// Validates the PSGC chain (throws AddressValidationError) and builds the
// columns to write. Done before any write, so an invalid address never
// clears the previous default either.
async function toAddressColumns(input: AddressInput) {
  const location = await resolveAddressCodes(input.location);
  return {
    label: input.label,
    recipient_name: input.recipientName,
    phone: input.phone,
    street: input.street,
    address2: input.address2 || null,
    region_code: location.regionCode,
    province_code: location.provinceCode,
    city_code: location.cityCode,
    barangay_code: location.barangayCode,
    region: location.region,
    province: location.province,
    city: location.city,
    barangay: location.barangay,
    postal_code: input.postalCode,
    is_default: input.isDefault,
  };
}

export async function createAddress(
  userEmail: string,
  input: AddressInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const columns = await toAddressColumns(input);

  if (input.isDefault) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_email", userEmail);
  }

  const { error } = await supabase
    .from("customer_addresses")
    .insert({ user_email: userEmail, ...columns });

  if (error) throw error;
}

export async function updateAddress(
  id: string,
  userEmail: string,
  input: AddressInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const columns = await toAddressColumns(input);

  if (input.isDefault) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_email", userEmail);
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update(columns)
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
