import { beforeAll, describe, expect, it } from "vitest";
import {
  AddressValidationError,
  checkAddressChain,
  listBarangays,
  listCities,
  listProvinces,
  listRegions,
  readAddressCodes,
  resolveAddressCodes,
  type BarangayChainRow,
} from "@/lib/psgc";
import { GET as getCities } from "@/app/api/locations/cities/route";
import { GET as getBarangays } from "@/app/api/locations/barangays/route";
import {
  assertPsgcSeeded,
  CEBU_CITY_LAHUG,
  MAKATI_BEL_AIR,
} from "./helpers/psgc-fixtures";

// Read-only against the dev database's psgc_* tables (migration 0025 +
// supabase/psgc/seed.mjs). Nothing here writes data, so there's nothing
// to clean up.

describe("checkAddressChain (pure rules)", () => {
  const row: BarangayChainRow = {
    code: CEBU_CITY_LAHUG.barangayCode,
    name: "Lahug",
    city_code: CEBU_CITY_LAHUG.cityCode,
    psgc_cities: {
      code: CEBU_CITY_LAHUG.cityCode,
      name: "City of Cebu",
      region_code: CEBU_CITY_LAHUG.regionCode,
      province_code: CEBU_CITY_LAHUG.provinceCode,
      psgc_regions: { name: "Region VII (Central Visayas)" },
      psgc_provinces: { name: "Cebu" },
    },
  };

  it("returns the snapshotted names for a consistent chain", () => {
    expect(checkAddressChain(CEBU_CITY_LAHUG, row)).toEqual({
      ...CEBU_CITY_LAHUG,
      region: "Region VII (Central Visayas)",
      province: "Cebu",
      city: "City of Cebu",
      barangay: "Lahug",
    });
  });

  it("rejects a barangay that isn't in the submitted city", () => {
    expect(() =>
      checkAddressChain({ ...CEBU_CITY_LAHUG, cityCode: MAKATI_BEL_AIR.cityCode }, row)
    ).toThrow(AddressValidationError);
  });

  it("rejects a city that isn't in the submitted province or region", () => {
    expect(() =>
      checkAddressChain({ ...CEBU_CITY_LAHUG, provinceCode: null }, row)
    ).toThrow(/don't match/);
    expect(() =>
      checkAddressChain({ ...CEBU_CITY_LAHUG, regionCode: "1300000000" }, row)
    ).toThrow(/don't match/);
  });

  it("rejects an unknown barangay", () => {
    expect(() => checkAddressChain(CEBU_CITY_LAHUG, null)).toThrow(
      AddressValidationError
    );
  });
});

describe("readAddressCodes", () => {
  it("treats a blank province as Metro Manila (null)", () => {
    expect(
      readAddressCodes({ ...MAKATI_BEL_AIR, provinceCode: "" }).provinceCode
    ).toBeNull();
  });
});

describe("PSGC lookups against dev", () => {
  beforeAll(assertPsgcSeeded);

  it("lists regions in PSA order, starting with NCR", async () => {
    const regions = await listRegions();
    expect(regions).toHaveLength(18);
    expect(regions[0].code).toBe("1300000000");
  });

  it("has no provinces for NCR", async () => {
    const provinces = await listProvinces();
    expect(provinces.some((p) => p.regionCode === "1300000000")).toBe(false);
    expect(provinces.find((p) => p.code === CEBU_CITY_LAHUG.provinceCode)?.name).toBe("Cebu");
  });

  it("lists NCR cities by region alone, and Cebu City under Cebu province", async () => {
    const ncr = await listCities("1300000000", null);
    expect(ncr.map((c) => c.name)).toContain("City of Makati");

    const cebu = await listCities(CEBU_CITY_LAHUG.regionCode, CEBU_CITY_LAHUG.provinceCode);
    expect(cebu.map((c) => c.code)).toContain(CEBU_CITY_LAHUG.cityCode);
    // Sorted ignoring the "City of" prefix.
    const names = cebu.map((c) => c.name.replace(/^City of /, ""));
    const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    expect(names).toEqual([...names].sort(collator.compare));
  });

  it("lists the City of Manila's barangays with their sub-municipality", async () => {
    const manila = await listBarangays("1380600000");
    expect(manila.length).toBeGreaterThan(800);
    expect(manila[0]).toMatchObject({ name: "Barangay 1", subMunicipality: "Tondo I/II" });
  });

  it("resolves a valid Metro Manila chain", async () => {
    const location = await resolveAddressCodes(MAKATI_BEL_AIR);
    expect(location).toMatchObject({
      region: "National Capital Region (NCR)",
      province: null,
      city: "City of Makati",
      barangay: "Bel-Air",
    });
  });

  it("resolves a valid provincial chain, including the province name", async () => {
    const location = await resolveAddressCodes(CEBU_CITY_LAHUG);
    expect(location).toMatchObject({ province: "Cebu", city: "City of Cebu", barangay: "Lahug" });
  });

  it("rejects a mismatched chain", async () => {
    await expect(
      resolveAddressCodes({ ...CEBU_CITY_LAHUG, cityCode: MAKATI_BEL_AIR.cityCode })
    ).rejects.toThrow(AddressValidationError);
    await expect(
      resolveAddressCodes({ ...MAKATI_BEL_AIR, provinceCode: CEBU_CITY_LAHUG.provinceCode })
    ).rejects.toThrow(AddressValidationError);
  });

  it("rejects an unknown or malformed code", async () => {
    await expect(
      resolveAddressCodes({ ...MAKATI_BEL_AIR, barangayCode: "1380399999" })
    ).rejects.toThrow(AddressValidationError);
    await expect(
      resolveAddressCodes({ ...MAKATI_BEL_AIR, barangayCode: "Bel-Air" })
    ).rejects.toThrow(AddressValidationError);
    await expect(
      resolveAddressCodes({ ...MAKATI_BEL_AIR, cityCode: "" })
    ).rejects.toThrow(AddressValidationError);
  });
});

describe("GET /api/locations/*", () => {
  beforeAll(assertPsgcSeeded);

  it("returns a province's cities with long cache headers", async () => {
    const res = await getCities(
      new Request(
        `http://localhost/api/locations/cities?region=${CEBU_CITY_LAHUG.regionCode}&province=${CEBU_CITY_LAHUG.provinceCode}`
      )
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.cities.map((c: { code: string }) => c.code)).toContain(CEBU_CITY_LAHUG.cityCode);
  });

  it("returns NCR's cities when no province is given", async () => {
    const res = await getCities(
      new Request("http://localhost/api/locations/cities?region=1300000000")
    );
    const body = await res.json();
    expect(body.cities.map((c: { code: string }) => c.code)).toContain(MAKATI_BEL_AIR.cityCode);
  });

  it("returns one city's barangays", async () => {
    const res = await getBarangays(
      new Request(`http://localhost/api/locations/barangays?city=${MAKATI_BEL_AIR.cityCode}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.barangays.map((b: { name: string }) => b.name)).toContain("Bel-Air");
  });

  it("rejects malformed codes", async () => {
    const cities = await getCities(new Request("http://localhost/api/locations/cities?region=NCR"));
    expect(cities.status).toBe(400);
    const barangays = await getBarangays(new Request("http://localhost/api/locations/barangays"));
    expect(barangays.status).toBe(400);
  });
});
