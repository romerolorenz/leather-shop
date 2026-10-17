import { getSupabaseServerClient } from "@/lib/supabase/server";

// Philippine Standard Geographic Code lookups for address entry
// (region -> province -> city/municipality -> barangay). The data is a
// bundled PSA snapshot seeded into the psgc_* tables (migration 0025,
// supabase/psgc/README.md), not a live third-party API.

export type PsgcRegion = { code: string; name: string };
export type PsgcProvince = { code: string; regionCode: string; name: string };
export type PsgcCity = { code: string; name: string; kind: "city" | "municipality" };
export type PsgcBarangay = { code: string; name: string; subMunicipality: string | null };

// What a form submits. provinceCode is null for Metro Manila (NCR), which
// has no provinces.
export type AddressCodes = {
  regionCode: string;
  provinceCode: string | null;
  cityCode: string;
  barangayCode: string;
};

// Codes plus the names they resolved to — what gets snapshotted onto
// customer_addresses / orders.
export type ResolvedLocation = AddressCodes & {
  region: string;
  province: string | null;
  city: string;
  barangay: string;
};

export class AddressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddressValidationError";
  }
}

const PSGC_CODE = /^\d{10}$/;

export function isPsgcCode(value: unknown): value is string {
  return typeof value === "string" && PSGC_CODE.test(value);
}

// Reads the four codes off a form/JSON body. Blank province becomes null
// (Metro Manila); anything malformed is passed through as-is so
// resolveAddressCodes() rejects it with a proper message.
export function readAddressCodes(source: {
  regionCode?: unknown;
  provinceCode?: unknown;
  cityCode?: unknown;
  barangayCode?: unknown;
}): AddressCodes {
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    regionCode: text(source.regionCode),
    provinceCode: text(source.provinceCode) || null,
    cityCode: text(source.cityCode),
    barangayCode: text(source.barangayCode),
  };
}

// "City of Makati" sorts under M, not C.
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const sortKey = (name: string) => name.replace(/^City of /i, "");
const byName = <T extends { name: string }>(a: T, b: T) =>
  collator.compare(sortKey(a.name), sortKey(b.name));

export async function listRegions(): Promise<PsgcRegion[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("psgc_regions")
    .select("code, name")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function listProvinces(): Promise<PsgcProvince[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("psgc_provinces")
    .select("code, region_code, name");
  if (error) throw error;
  return data
    .map((p) => ({ code: p.code, regionCode: p.region_code, name: p.name }))
    .sort(byName);
}

// Cities/municipalities in a province, or — with provinceCode null — the
// province-less cities of a region (only NCR has those).
export async function listCities(
  regionCode: string,
  provinceCode: string | null
): Promise<PsgcCity[]> {
  let query = getSupabaseServerClient()
    .from("psgc_cities")
    .select("code, name, kind")
    .eq("region_code", regionCode);
  query = provinceCode
    ? query.eq("province_code", provinceCode)
    : query.is("province_code", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data as PsgcCity[]).sort(byName);
}

export async function listBarangays(cityCode: string): Promise<PsgcBarangay[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("psgc_barangays")
    .select("code, name, sub_municipality")
    .eq("city_code", cityCode);
  if (error) throw error;
  return data
    .map((b) => ({ code: b.code, name: b.name, subMunicipality: b.sub_municipality }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

// The row shape resolveAddressCodes() reads — a barangay with its city,
// the city's region and province embedded.
export type BarangayChainRow = {
  code: string;
  name: string;
  city_code: string;
  psgc_cities: {
    code: string;
    name: string;
    region_code: string;
    province_code: string | null;
    psgc_regions: { name: string } | null;
    psgc_provinces: { name: string } | null;
  } | null;
};

// Pure half of resolveAddressCodes(): checks that the submitted codes form
// one consistent chain (barangay in city, in province, in region). Split
// out so the rules are testable without a database.
export function checkAddressChain(
  codes: AddressCodes,
  row: BarangayChainRow | null
): ResolvedLocation {
  const city = row?.psgc_cities;
  if (!row || !city || !city.psgc_regions) {
    throw new AddressValidationError(
      "Please choose your barangay from the list."
    );
  }
  if (
    row.city_code !== codes.cityCode ||
    city.region_code !== codes.regionCode ||
    (city.province_code ?? null) !== codes.provinceCode
  ) {
    throw new AddressValidationError(
      "The region, province, city and barangay don't match. Please pick them again."
    );
  }
  return {
    ...codes,
    region: city.psgc_regions.name,
    province: city.psgc_provinces?.name ?? null,
    city: city.name,
    barangay: row.name,
  };
}

// Validates the code chain against the PSGC tables and returns the names
// to snapshot. Throws AddressValidationError for anything a customer can
// fix by re-picking. Never trusts client-sent names.
export async function resolveAddressCodes(codes: AddressCodes): Promise<ResolvedLocation> {
  const allCodes = [codes.regionCode, codes.cityCode, codes.barangayCode];
  if (codes.provinceCode !== null) allCodes.push(codes.provinceCode);
  if (!codes.regionCode || !codes.cityCode || !codes.barangayCode) {
    throw new AddressValidationError(
      "Please choose your region, city or municipality, and barangay."
    );
  }
  if (!allCodes.every(isPsgcCode)) {
    throw new AddressValidationError("Please choose your barangay from the list.");
  }

  const { data, error } = await getSupabaseServerClient()
    .from("psgc_barangays")
    .select(
      "code, name, city_code, psgc_cities(code, name, region_code, province_code, psgc_regions(name), psgc_provinces(name))"
    )
    .eq("code", codes.barangayCode)
    .maybeSingle();
  if (error) throw error;

  return checkAddressChain(codes, data as unknown as BarangayChainRow | null);
}
