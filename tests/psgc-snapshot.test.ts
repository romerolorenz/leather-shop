import { describe, expect, it } from "vitest";
import { derivePsgcTables } from "../supabase/psgc/derive.mjs";
import { readSnapshot } from "../supabase/psgc/snapshot-io.mjs";

// No database: checks the bundled PSGC snapshot (supabase/psgc/data/) that
// seed.mjs loads, and the pure derivation logic behind it. A PSA
// refresh that breaks one of these invariants should fail here before it
// reaches any database.

const snapshot = readSnapshot();

describe("bundled PSGC snapshot", () => {
  it("matches the counts recorded in meta.json", () => {
    expect(snapshot.meta.counts).toEqual({
      regions: snapshot.regions.length,
      provinces: snapshot.provinces.length,
      cities: snapshot.cities.length,
      barangays: snapshot.barangays.length,
    });
    expect(snapshot.regions).toHaveLength(18);
    expect(snapshot.barangays.length).toBeGreaterThan(40000);
  });

  it("forms one consistent region -> province -> city -> barangay tree", () => {
    const regions = new Set(snapshot.regions.map((r) => r.code));
    const provinces = new Map(snapshot.provinces.map((p) => [p.code, p]));
    const cities = new Map(snapshot.cities.map((c) => [c.code, c]));

    for (const p of snapshot.provinces) expect(regions.has(p.regionCode)).toBe(true);
    for (const c of snapshot.cities) {
      expect(regions.has(c.regionCode)).toBe(true);
      if (c.provinceCode) {
        expect(provinces.get(c.provinceCode)?.regionCode).toBe(c.regionCode);
      }
    }
    for (const b of snapshot.barangays) expect(cities.has(b.cityCode)).toBe(true);
    expect(new Set(snapshot.barangays.map((b) => b.code)).size).toBe(
      snapshot.barangays.length
    );
  });

  it("leaves every Metro Manila city without a province, and only those", () => {
    const provinceless = snapshot.cities.filter((c) => !c.provinceCode);
    expect(provinceless.length).toBe(17); // 16 cities + Pateros
    expect(provinceless.every((c) => c.regionCode === "1300000000")).toBe(true);
  });

  it("files highly urbanized cities under their geographic province", () => {
    const provinceName = (cityName: string) => {
      const city = snapshot.cities.find((c) => c.name === cityName);
      return snapshot.provinces.find((p) => p.code === city?.provinceCode)?.name;
    };
    expect(provinceName("City of Cebu")).toBe("Cebu");
    expect(provinceName("City of Davao")).toBe("Davao del Sur");
    expect(provinceName("City of Baguio")).toBe("Benguet");
    expect(provinceName("City of Isabela")).toBe("City of Isabela");
  });

  it("attaches the City of Manila's barangays to Manila, keeping the sub-municipality", () => {
    const manila = snapshot.barangays.filter((b) => b.cityCode === "1380600000");
    expect(manila.length).toBeGreaterThan(800);
    expect(manila.every((b) => b.subMunicipality)).toBe(true);
    expect(manila.find((b) => b.code === "1380601001")?.subMunicipality).toBe("Tondo I/II");
  });
});

describe("derivePsgcTables", () => {
  const header = [
    "10-digit PSGC",
    "Name",
    "Correspondence Code",
    "Geographic Level",
    "Old names",
    "City Class",
  ];
  const baseRows = [
    ["1300000000", "National Capital Region (NCR)", "130000000", "Reg"],
    ["1380300000", "City of Makati", "137602000", "City", "", "HUC"],
    ["1380300002", "Bel-Air", "137602003", "Bgy"],
    ["0700000000", "Region VII (Central Visayas)", "070000000", "Reg"],
    ["0702200000", "Cebu", "072200000", "Prov"],
    ["0702201000", "Alcantara", "072201000", "Mun"],
    ["0702201001", "Cabadiangan", "072201001", "Bgy"],
    ["0730600000", "City of Cebu ", "072217000", "City", "", "HUC"],
    ["0730600041", "Lahug", "072217041", "Bgy"],
  ];

  it("handles NCR, HUCs and plain municipalities", () => {
    const tables = derivePsgcTables([header, ...baseRows]);
    const city = (code: string) => tables.cities.find((c) => c.code === code);

    expect(city("1380300000")?.provinceCode).toBeNull();
    expect(city("0702201000")?.provinceCode).toBe("0702200000");
    expect(city("0730600000")).toMatchObject({
      provinceCode: "0702200000",
      name: "City of Cebu", // trailing space trimmed
      kind: "city",
      cityClass: "HUC",
    });
    expect(tables.barangays.find((b) => b.code === "0730600041")?.cityCode).toBe(
      "0730600000"
    );
  });

  it("throws on a HUC whose geographic province can't be found", () => {
    const rows = [...baseRows, ["0731100000", "City of Nowhere", "079999000", "City", "", "HUC"]];
    expect(() => derivePsgcTables([header, ...rows])).toThrow(/geographic province/);
  });

  it("throws on an unknown geographic level", () => {
    const rows = [...baseRows, ["0702201002", "Odd", "", "Purok"]];
    expect(() => derivePsgcTables([header, ...rows])).toThrow(/Unknown PSGC level/);
  });
});
