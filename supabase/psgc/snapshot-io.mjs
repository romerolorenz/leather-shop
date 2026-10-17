// Reads/writes the bundled PSGC snapshot (supabase/psgc/data/*.tsv). Tab-
// separated because PSGC names contain commas but never tabs; one row per
// line keeps PSA refreshes reviewable as a plain git diff.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ code: string, name: string, sortOrder: number }} PsgcRegionRow
 * @typedef {{ code: string, regionCode: string, name: string }} PsgcProvinceRow
 * @typedef {{ code: string, regionCode: string, provinceCode: string | null, name: string, kind: "city" | "municipality", cityClass: string | null }} PsgcCityRow
 * @typedef {{ code: string, cityCode: string, name: string, subMunicipality: string | null }} PsgcBarangayRow
 * @typedef {{ regions: PsgcRegionRow[], provinces: PsgcProvinceRow[], cities: PsgcCityRow[], barangays: PsgcBarangayRow[] }} PsgcTables
 */

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");

const TABLES = {
  regions: ["code", "name", "sortOrder"],
  provinces: ["code", "regionCode", "name"],
  cities: ["code", "regionCode", "provinceCode", "name", "kind", "cityClass"],
  barangays: ["code", "cityCode", "name", "subMunicipality"],
};

/**
 * @param {PsgcTables} tables
 * @param {Record<string, any>} meta
 */
export function writeSnapshot(tables, meta, dir = DATA_DIR) {
  mkdirSync(dir, { recursive: true });
  for (const [table, columns] of Object.entries(TABLES)) {
    const lines = [columns.join("\t")];
    for (const row of tables[table]) {
      lines.push(
        columns
          .map((c) => {
            const value = row[c] ?? "";
            if (/[\t\n]/.test(String(value))) {
              throw new Error(`Tab/newline in ${table}.${c}: ${value}`);
            }
            return value;
          })
          .join("\t")
      );
    }
    writeFileSync(join(dir, `${table}.tsv`), lines.join("\n") + "\n");
  }
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
}

/** @returns {PsgcTables & { meta: Record<string, any> }} */
export function readSnapshot(dir = DATA_DIR) {
  /** @type {Record<string, any>} */
  const tables = {};
  for (const [table, columns] of Object.entries(TABLES)) {
    const [header, ...lines] = readFileSync(join(dir, `${table}.tsv`), "utf8")
      .split("\n")
      .filter(Boolean);
    if (header !== columns.join("\t")) {
      throw new Error(`${table}.tsv has unexpected columns: ${header}`);
    }
    tables[table] = lines.map((line) => {
      const values = line.split("\t");
      const row = Object.fromEntries(columns.map((c, i) => [c, values[i] || null]));
      if ("sortOrder" in row) row.sortOrder = Number(row.sortOrder);
      return row;
    });
  }
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  return /** @type {any} */ ({ ...tables, meta });
}
