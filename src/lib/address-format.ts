// One shared shape for showing a delivery address everywhere it appears
// (checkout address cards, /account/addresses, /admin/orders, every order
// email), so an address reads the same way in all of them:
//
//   {street}, {address2}
//   Brgy. {barangay}, {city}
//   {province}, {region} {postalCode}
//
// Province is left out for Metro Manila, which has none. Addresses saved
// before nationwide delivery have no region/province snapshot; those fall
// back to the older two-line shape ("Brgy. {barangay}, {city} {postal}").

export type DisplayAddress = {
  street: string;
  address2: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
};

// PSGC names many barangays "Barangay 12" or "Brgy. ..." already —
// don't print "Brgy. Barangay 12".
export function barangayLabel(name: string): string {
  if (!name) return "";
  return /^(barangay|brgy|bgy)\b/i.test(name) ? name : `Brgy. ${name}`;
}

export function formatAddressLines(address: DisplayAddress): string[] {
  const line1 = address.address2
    ? `${address.street}, ${address.address2}`
    : address.street;
  const locality = [barangayLabel(address.barangay), address.city]
    .filter(Boolean)
    .join(", ");

  if (!address.region) {
    return [line1, [locality, address.postalCode].filter(Boolean).join(" ")];
  }

  const area = [address.province, address.region].filter(Boolean).join(", ");
  return [line1, locality, [area, address.postalCode].filter(Boolean).join(" ")];
}
