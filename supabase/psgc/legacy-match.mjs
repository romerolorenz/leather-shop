// Best-effort match of a pre-PSGC saved address (free-text city from the
// old Metro Manila list, free-typed barangay) to PSGC codes. Pure, so it's
// unit-tested directly (tests/psgc-snapshot.test.ts); used by seed.mjs.
//
// Only Metro Manila cities are considered, because the old delivery list
// only ever allowed those. That also avoids false matches on names shared
// across the country ("San Juan" is a Metro Manila city but also a town in
// Batangas, La Union, ...).

const strip = (/** @type {string} */ s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // "Las Piñas" ~ "Las Pinas"
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** @param {string} name */
export function normalizeCityName(name) {
  return strip(name).replace(/^city of /, "").replace(/ city$/, "");
}

/** @param {string} name */
export function normalizeBarangayName(name) {
  return strip(name)
    .replace(/^(brgy|bgy|barangay) /, "")
    .replace(/ (pob|poblacion)$/, "")
    .replace(/ /g, "");
}

// Returns { city, barangay }; either can be null. A barangay is only
// returned when exactly one barangay in the matched city has that name.
/**
 * @template {{ code: string, name: string }} C
 * @template {{ code: string, name: string }} B
 * @param {{ city?: string | null, barangay?: string | null }} address
 * @param {C[]} ncrCities
 * @param {Map<string, B[]>} barangaysByCity
 * @returns {{ city: C | null, barangay: B | null }}
 */
export function matchLegacyAddress(address, ncrCities, barangaysByCity) {
  const cityKey = normalizeCityName(address.city ?? "");
  const cityMatches = ncrCities.filter((c) => normalizeCityName(c.name) === cityKey);
  if (cityMatches.length !== 1) return { city: null, barangay: null };
  const city = cityMatches[0];

  const barangayKey = normalizeBarangayName(address.barangay ?? "");
  if (!barangayKey) return { city, barangay: null };
  const barangayMatches = (barangaysByCity.get(city.code) ?? []).filter(
    (b) => normalizeBarangayName(b.name) === barangayKey
  );
  return { city, barangay: barangayMatches.length === 1 ? barangayMatches[0] : null };
}
