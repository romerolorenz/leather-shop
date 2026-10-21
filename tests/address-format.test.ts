import { describe, expect, it } from "vitest";
import { barangayLabel, formatAddressLines } from "@/lib/address-format";

const base = {
  street: "12 Mango St",
  address2: "",
  postalCode: "6000",
};

describe("formatAddressLines", () => {
  it("shows barangay, city, province and region for an address outside NCR", () => {
    expect(
      formatAddressLines({
        ...base,
        address2: "Unit 4B",
        barangay: "Lahug",
        city: "City of Cebu",
        province: "Cebu",
        region: "Region VII (Central Visayas)",
      })
    ).toEqual([
      "12 Mango St, Unit 4B",
      "Brgy. Lahug, City of Cebu",
      "Cebu, Region VII (Central Visayas) 6000",
    ]);
  });

  it("leaves the province out for Metro Manila", () => {
    expect(
      formatAddressLines({
        ...base,
        postalCode: "1209",
        barangay: "Bel-Air",
        city: "City of Makati",
        province: "",
        region: "National Capital Region (NCR)",
      })
    ).toEqual([
      "12 Mango St",
      "Brgy. Bel-Air, City of Makati",
      "National Capital Region (NCR) 1209",
    ]);
  });

  it("keeps the old two-line shape for addresses saved before PSGC", () => {
    expect(
      formatAddressLines({
        ...base,
        postalCode: "1600",
        barangay: "Kapitolyo",
        city: "Pasig",
        province: "",
        region: "",
      })
    ).toEqual(["12 Mango St", "Brgy. Kapitolyo, Pasig 1600"]);
  });
});

describe("barangayLabel", () => {
  it("doesn't double up the Brgy. prefix", () => {
    expect(barangayLabel("Barangay 12")).toBe("Barangay 12");
    expect(barangayLabel("Lahug")).toBe("Brgy. Lahug");
    expect(barangayLabel("")).toBe("");
  });
});
