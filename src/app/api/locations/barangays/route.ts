import { NextResponse } from "next/server";
import { isPsgcCode, listBarangays } from "@/lib/psgc";
import { LOCATIONS_CACHE_CONTROL } from "@/lib/locations-api";

// GET /api/locations/barangays?city=<code>
// Barangays for one city/municipality — loaded on demand so the browser
// never downloads all ~42k.
export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city");

  if (!isPsgcCode(city)) {
    return NextResponse.json(
      { error: "A valid city code is required." },
      { status: 400 }
    );
  }

  const barangays = await listBarangays(city);
  return NextResponse.json(
    { barangays },
    { headers: { "Cache-Control": LOCATIONS_CACHE_CONTROL } }
  );
}
