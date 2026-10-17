// Turns the PSA's PSGC sheet rows into the four reference tables the shop
// uses (psgc_regions / psgc_provinces / psgc_cities / psgc_barangays —
// supabase/migrations/0025_nationwide_delivery_psgc.sql). Pure function, no
// I/O, so it's unit-tested directly (tests/psgc-snapshot.test.ts).
//
// The 10-digit PSGC code is RR PPP MM BBB: region, province, city or
// municipality, barangay. Quirks handled here:
//
// - NCR (Metro Manila) has no provinces. Its cities take the province slot
//   of the code (Makati = 13 803 00 000), so they're stored with
//   province_code = null and the checkout's province step is skipped.
// - Highly urbanized cities (HUCs) outside NCR are also coded in their own
//   province slot (Cebu City = 07 306 00 000), because they're
//   administratively independent of a province. Customers look for them
//   under their geographic province, so they're filed under it, using the
//   old 9-digit "Correspondence Code", whose RRPP part still names the
//   geographic province (Cebu City = 0722 17000 -> Cebu, 0722).
//   Independent component cities (ICCs) are already coded under their
//   province, so they need nothing extra.
// - The City of Manila's barangays sit under 14 sub-municipalities
//   (Tondo, Sampaloc, ...). They're attached to the City of Manila, with
//   the sub-municipality kept so the dropdown can show it.
// - Two province-level groupings aren't real provinces: "City of Isabela
//   (Not a Province)" (Region IX — geographically on Basilan, which is in
//   BARMM, a different region) and BARMM's "Special Geographic Area".
//   They stay as provinces in their own region, as PSA has them, so the
//   region -> province -> city chain stays consistent.
//
// Anything else unexpected throws instead of being silently mis-filed, so
// a future PSA refresh that adds a new quirk fails loudly at build time.

function cleanName(name) {
  return name.replace(/\s+/g, " ").trim();
}

function findColumn(header, startsWith) {
  const index = header.findIndex((h) =>
    h.replace(/\s+/g, " ").trim().toLowerCase().startsWith(startsWith)
  );
  if (index < 0) throw new Error(`PSGC sheet has no "${startsWith}" column.`);
  return index;
}

/**
 * @param {string[][]} sheetRows the PSGC sheet, header row first
 * @returns {import("./snapshot-io.mjs").PsgcTables}
 */
export function derivePsgcTables(sheetRows) {
  const [header, ...body] = sheetRows;
  const col = {
    code: findColumn(header, "10-digit psgc"),
    name: findColumn(header, "name"),
    corr: findColumn(header, "correspondence code"),
    level: findColumn(header, "geographic level"),
    cityClass: findColumn(header, "city class"),
  };

  const rows = body
    .filter((r) => /^\d{10}$/.test((r[col.code] ?? "").trim()))
    .map((r) => ({
      code: r[col.code].trim(),
      name: cleanName(r[col.name] ?? ""),
      corr: (r[col.corr] ?? "").trim(),
      level: (r[col.level] ?? "").trim(),
      cityClass: (r[col.cityClass] ?? "").trim(),
    }));

  const regionOf = (code) => `${code.slice(0, 2)}00000000`;
  const provinceSlotOf = (code) => `${code.slice(0, 5)}00000`;

  const regions = [];
  const provinces = new Map();
  const cityRows = [];
  const subMunicipalities = new Map();
  const barangayRows = [];

  for (const row of rows) {
    switch (row.level) {
      case "Reg":
        regions.push({ code: row.code, name: row.name, sortOrder: regions.length + 1 });
        break;
      case "Prov":
        provinces.set(row.code, {
          code: row.code,
          regionCode: regionOf(row.code),
          name: row.name,
          corr: row.corr,
        });
        break;
      case "":
        // Province-level groupings that aren't provinces (see header).
        if (row.code.endsWith("00000")) {
          provinces.set(row.code, {
            code: row.code,
            regionCode: regionOf(row.code),
            name: row.name.replace(/\s*\(Not a Province\)\s*$/i, ""),
            corr: "",
          });
          break;
        }
        throw new Error(`Unexpected PSGC row with no level: ${row.code} ${row.name}`);
      case "City":
      case "Mun":
        cityRows.push(row);
        break;
      case "SubMun":
        subMunicipalities.set(row.code, row);
        break;
      case "Bgy":
        barangayRows.push(row);
        break;
      default:
        throw new Error(`Unknown PSGC level "${row.level}" on ${row.code} ${row.name}`);
    }
  }

  const regionCodes = new Set(regions.map((r) => r.code));
  const regionsWithProvinces = new Set(
    [...provinces.values()].map((p) => p.regionCode)
  );
  const provinceByCorr = new Map(
    [...provinces.values()]
      .filter((p) => p.corr)
      .map((p) => [p.corr.slice(0, 4), p])
  );

  const cities = new Map();
  for (const row of cityRows) {
    const regionCode = regionOf(row.code);
    if (!regionCodes.has(regionCode)) {
      throw new Error(`City ${row.code} ${row.name} has no region row.`);
    }

    let provinceCode = null;
    const adminParent = provinces.get(provinceSlotOf(row.code));
    if (adminParent) {
      provinceCode = adminParent.code;
    } else if (regionsWithProvinces.has(regionCode)) {
      // HUC: file under its geographic province (same region only).
      const geographic = provinceByCorr.get(row.corr.slice(0, 4));
      if (!geographic || geographic.regionCode !== regionCode) {
        throw new Error(
          `Can't find a geographic province for ${row.code} ${row.name} (correspondence code ${row.corr || "none"}).`
        );
      }
      provinceCode = geographic.code;
    }
    // else: a region with no provinces (NCR) — province stays null.

    cities.set(row.code, {
      code: row.code,
      regionCode,
      provinceCode,
      name: row.name,
      kind: row.level === "City" ? "city" : "municipality",
      cityClass: row.cityClass || null,
    });
  }

  const barangays = barangayRows.map((row) => {
    const parent = `${row.code.slice(0, 7)}000`;
    if (cities.has(parent)) {
      return { code: row.code, cityCode: parent, name: row.name, subMunicipality: null };
    }
    const sub = subMunicipalities.get(parent);
    const subCity = sub && cities.get(provinceSlotOf(sub.code));
    if (subCity) {
      return {
        code: row.code,
        cityCode: subCity.code,
        name: row.name,
        subMunicipality: sub.name,
      };
    }
    throw new Error(`Barangay ${row.code} ${row.name} has no city or sub-municipality.`);
  });

  return {
    regions,
    provinces: [...provinces.values()].map((p) => ({
      code: p.code,
      regionCode: p.regionCode,
      name: p.name,
    })),
    cities: [...cities.values()],
    barangays,
  };
}
