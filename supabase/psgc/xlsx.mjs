// Minimal, dependency-free .xlsx sheet reader — just enough to read the
// PSA's PSGC publication workbook (one sheet of plain text/number cells).
// An .xlsx file is a zip of XML files; this reads the zip's central
// directory, inflates the two entries it needs (shared strings + the
// sheet), and pulls cell values out with regexes. Not a general-purpose
// Excel parser — it ignores formulas, styles and dates, which the PSGC
// sheet doesn't rely on.

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

function readZipEntries(buffer) {
  // End-of-central-directory record: last 22+ bytes, signature 0x06054b50.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file (no end-of-central-directory record).");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let n = 0; n < entryCount; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Corrupt zip central directory.");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeader = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.set(name, { method, compressedSize, localHeader });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return {
    names: [...entries.keys()],
    read(name) {
      const entry = entries.get(name);
      if (!entry) throw new Error(`Zip entry not found: ${name}`);
      const h = entry.localHeader;
      const dataStart =
        h + 30 + buffer.readUInt16LE(h + 26) + buffer.readUInt16LE(h + 28);
      const data = buffer.subarray(dataStart, dataStart + entry.compressedSize);
      if (entry.method === 0) return data.toString("utf8");
      if (entry.method === 8) return inflateRawSync(data).toString("utf8");
      throw new Error(`Unsupported zip compression method ${entry.method}`);
    },
  };
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Concatenates every <t> run inside a string item (rich text has several).
function textRuns(xml) {
  let out = "";
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return decodeXml(out);
}

function columnIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Returns the workbook's sheet names mapped to their zip paths.
function sheetPaths(zip) {
  const workbook = zip.read("xl/workbook.xml");
  const rels = zip.read("xl/_rels/workbook.xml.rels");
  const targets = new Map();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1];
    const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) targets.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets = new Map();
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/\bname="([^"]+)"/)[1]);
    const rid = m[0].match(/\br:id="([^"]+)"/)[1];
    sheets.set(name, targets.get(rid));
  }
  return sheets;
}

// Reads one sheet as an array of rows (arrays of strings; missing cells
// are ""). `sheetName` is the tab name shown in Excel, e.g. "PSGC".
export function readSheet(filePath, sheetName) {
  const zip = readZipEntries(readFileSync(filePath));
  const path = sheetPaths(zip).get(sheetName);
  if (!path) throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);

  const shared = zip.names.includes("xl/sharedStrings.xml")
    ? [...zip.read("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
        (m) => textRuns(m[1])
      )
    : [];

  const rows = [];
  const sheet = zip.read(path);
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cell of rowMatch[1].matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    )) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      let value = "";
      if (type === "inlineStr") {
        value = textRuns(body);
      } else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v === undefined) continue;
        value = type === "s" ? shared[Number(v)] : decodeXml(v);
      }
      row[columnIndex(ref)] = value;
    }
    if (row.length) rows.push(Array.from(row, (v) => v ?? ""));
  }
  return rows;
}
