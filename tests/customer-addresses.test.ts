import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
  type AddressInput,
} from "@/lib/customer/addresses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AddressValidationError } from "@/lib/psgc";
import {
  assertPsgcSeeded,
  CEBU_CITY_LAHUG,
  MAKATI_BEL_AIR,
} from "./helpers/psgc-fixtures";

// Runs against the real (dev) Supabase project — there's no separate test
// database. Every test cleans up any address it creates.

const TEST_EMAIL = "vitest-addresses@example.com";
const OTHER_EMAIL = "vitest-other@example.com";
const cleanupAddressIds: string[] = [];

beforeAll(assertPsgcSeeded);

afterEach(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of cleanupAddressIds.splice(0)) {
    await supabase.from("customer_addresses").delete().eq("id", id);
  }
  // Safety net: these emails are test-only, so anything a failed
  // assertion left behind (before its id was recorded) goes too.
  await supabase
    .from("customer_addresses")
    .delete()
    .in("user_email", [TEST_EMAIL, OTHER_EMAIL]);
});

function buildAddress(overrides: Partial<AddressInput> = {}): AddressInput {
  return {
    label: "Home",
    recipientName: "Vitest Tester",
    phone: "0917 000 0000",
    street: "1 Test St",
    address2: "",
    postalCode: "1209",
    location: MAKATI_BEL_AIR,
    isDefault: false,
    ...overrides,
  };
}

describe("listAddresses", () => {
  it("only returns addresses for the given user_email", async () => {
    await createAddress(TEST_EMAIL, buildAddress());
    const otherEmail = OTHER_EMAIL;
    await createAddress(otherEmail, buildAddress());

    const [mine, theirs] = await Promise.all([
      listAddresses(TEST_EMAIL),
      listAddresses(otherEmail),
    ]);

    cleanupAddressIds.push(...mine.map((a) => a.id), ...theirs.map((a) => a.id));

    expect(mine).toHaveLength(1);
    expect(theirs).toHaveLength(1);
    expect(mine[0].id).not.toBe(theirs[0].id);
  });
});

describe("createAddress", () => {
  it("clears the previous default when a new address is marked default", async () => {
    await createAddress(TEST_EMAIL, buildAddress({ label: "Home", isDefault: true }));
    await createAddress(TEST_EMAIL, buildAddress({ label: "Office", isDefault: true }));

    const addresses = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(...addresses.map((a) => a.id));

    const defaults = addresses.filter((a) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe("Office");
  });
});

describe("updateAddress", () => {
  it("updates fields and ignores a mismatched user_email (ownership check)", async () => {
    await createAddress(TEST_EMAIL, buildAddress({ label: "Home" }));
    const [address] = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(address.id);

    await updateAddress(
      address.id,
      "someone-else@example.com",
      buildAddress({ label: "Hijacked" })
    );

    const [unchanged] = await listAddresses(TEST_EMAIL);
    expect(unchanged.label).toBe("Home");

    await updateAddress(address.id, TEST_EMAIL, buildAddress({ label: "Updated" }));
    const [updated] = await listAddresses(TEST_EMAIL);
    expect(updated.label).toBe("Updated");
  });
});

describe("deleteAddress", () => {
  it("does not delete another user's address", async () => {
    await createAddress(TEST_EMAIL, buildAddress());
    const [address] = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(address.id);

    await deleteAddress(address.id, "someone-else@example.com");
    expect(await listAddresses(TEST_EMAIL)).toHaveLength(1);

    await deleteAddress(address.id, TEST_EMAIL);
    expect(await listAddresses(TEST_EMAIL)).toHaveLength(0);
    cleanupAddressIds.length = 0;
  });
});

describe("PSGC codes on saved addresses", () => {
  it("snapshots region, province, city and barangay names from the codes", async () => {
    await createAddress(
      TEST_EMAIL,
      buildAddress({ location: CEBU_CITY_LAHUG, postalCode: "6000" })
    );
    const [address] = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(address.id);

    expect(address).toMatchObject({
      ...CEBU_CITY_LAHUG,
      region: "Region VII (Central Visayas)",
      province: "Cebu",
      city: "City of Cebu",
      barangay: "Lahug",
      needsUpdate: false,
    });
  });

  it("stores no province for a Metro Manila address", async () => {
    await createAddress(TEST_EMAIL, buildAddress());
    const [address] = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(address.id);

    expect(address.provinceCode).toBeNull();
    expect(address.province).toBe("");
    expect(address.city).toBe("City of Makati");
  });

  it("rejects an inconsistent chain and saves nothing", async () => {
    await expect(
      createAddress(
        TEST_EMAIL,
        buildAddress({
          location: { ...CEBU_CITY_LAHUG, barangayCode: MAKATI_BEL_AIR.barangayCode },
        })
      )
    ).rejects.toThrow(AddressValidationError);
    expect(await listAddresses(TEST_EMAIL)).toHaveLength(0);
  });

  it("re-resolves names when an update changes the codes, and rejects a bad update", async () => {
    await createAddress(TEST_EMAIL, buildAddress());
    const [address] = await listAddresses(TEST_EMAIL);
    cleanupAddressIds.push(address.id);

    await updateAddress(
      address.id,
      TEST_EMAIL,
      buildAddress({ location: CEBU_CITY_LAHUG, postalCode: "6000" })
    );
    const [moved] = await listAddresses(TEST_EMAIL);
    expect(moved).toMatchObject({ city: "City of Cebu", province: "Cebu", barangay: "Lahug" });

    await expect(
      updateAddress(
        address.id,
        TEST_EMAIL,
        buildAddress({ location: { ...CEBU_CITY_LAHUG, provinceCode: null } })
      )
    ).rejects.toThrow(AddressValidationError);
    const [unchanged] = await listAddresses(TEST_EMAIL);
    expect(unchanged.barangayCode).toBe(CEBU_CITY_LAHUG.barangayCode);
  });

  it("flags a pre-PSGC address (no codes) as needing an update", async () => {
    const { data, error } = await getSupabaseServerClient()
      .from("customer_addresses")
      .insert({
        user_email: TEST_EMAIL,
        label: "Old",
        recipient_name: "Vitest Tester",
        phone: "0917 000 0000",
        street: "1 Test St",
        city: "Pasig",
        barangay: "Kapitolyo",
      })
      .select("id")
      .single();
    if (data) cleanupAddressIds.push(data.id);
    expect(error).toBeNull();

    const [address] = await listAddresses(TEST_EMAIL);
    expect(address.needsUpdate).toBe(true);
  });
});
