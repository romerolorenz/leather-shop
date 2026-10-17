import { NextResponse } from "next/server";
import { isPsgcCode, listCities } from "@/lib/psgc";
import { LOCATIONS_CACHE_CONTROL } from "@/lib/locations-api";

// GET /api/locations/cities?region=<code>&province=<code>
// Cities and municipalities for the checkout/address dropdowns, loaded on
// demand per province. Omit `province` for Metro Manila (NCR), whose
// cities have no province.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = params.get("region");
  const province = params.get("province") || null;

  if (!isPsgcCode(region) || (province !== null && !isPsgcCode(province))) {
    return NextResponse.json(
      { error: "A valid region (and province) code is required." },
      { status: 400 }
    );
  }

  const cities = await listCities(region, province);
  return NextResponse.json(
    { cities },
    { headers: { "Cache-Control": LOCATIONS_CACHE_CONTROL } }
  );
}
