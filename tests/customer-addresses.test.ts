import { afterEach, describe, expect, it } from "vitest";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
  type AddressInput,
} from "@/lib/customer/addresses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project — there's no separate test
// database. Every test cleans up any address it creates.

const TEST_EMAIL = "vitest-addresses@example.com";
const cleanupAddressIds: string[] = [];

afterEach(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of cleanupAddressIds.splice(0)) {
    await supabase.from("customer_addresses").delete().eq("id", id);
  }
});

function buildAddress(overrides: Partial<AddressInput> = {}): AddressInput {
  return {
    label: "Home",
    recipientName: "Vitest Tester",
    phone: "0917 000 0000",
    street: "1 Test St",
    address2: "",
    barangay: "Test Barangay",
    city: "Pasig",
    postalCode: "1600",
    isDefault: false,
    ...overrides,
  };
}

describe("listAddresses", () => {
  it("only returns addresses for the given user_email", async () => {
    await createAddress(TEST_EMAIL, buildAddress());
    const otherEmail = "vitest-other@example.com";
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
