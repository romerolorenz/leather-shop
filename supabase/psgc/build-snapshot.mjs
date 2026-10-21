#!/usr/bin/env node
// Rebuilds the bundled PSGC snapshot (supabase/psgc/data/) from a PSA
// "PSGC Publication Datafile" .xlsx. Only needed when refreshing to a newer
// PSA release; see supabase/psgc/README.md. Touches no database.
//
//   node supabase/psgc/build-snapshot.mjs ~/Downloads/PSGC-3Q-2026-Publication-Datafile.xlsx

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { readSheet } from "./xlsx.mjs";
import { derivePsgcTables } from "./derive.mjs";
import { writeSnapshot, DATA_DIR } from "./snapshot-io.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node supabase/psgc/build-snapshot.mjs <PSGC-...-Publication-Datafile.xlsx>");
  process.exit(1);
}

const metadata = Object.fromEntries(
  readSheet(file, "Metadata")
    .filter((r) => r[0])
    .map((r) => [r[0].replace(/:$/, "").trim(), (r[1] ?? "").trim()])
);
const tables = derivePsgcTables(readSheet(file, "PSGC"));

const meta = {
  source: "Philippine Statistics Authority (PSA), Philippine Standard Geographic Code",
  sourceUrl: "https://psa.gov.ph/classification/psgc",
  sourceFile: basename(file),
  sourceSha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
  publicationDate: metadata["Publication date"] ?? null,
  useConstraints: metadata["Use constraints"] ?? null,
  builtAt: new Date().toISOString().slice(0, 10),
  counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
};

writeSnapshot(tables, meta);
console.log(`Wrote ${DATA_DIR}`);
console.log(JSON.stringify(meta, null, 2));
