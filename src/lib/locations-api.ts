// PSGC data only changes when the bundled snapshot is re-seeded (a few
// times a year at most), so the location lists are cached hard: a day in
// the browser and a week at Vercel's edge, which means most dropdown loads
// never reach the database. If a refresh retires a code, a customer still
// seeing the old list just gets "please pick again" from the server-side
// chain check (src/lib/psgc.ts).
export const LOCATIONS_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
