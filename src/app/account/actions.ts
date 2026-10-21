"use server";

import { revalidatePath } from "next/cache";
import { assertCustomer } from "@/lib/customer/auth";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressInput,
} from "@/lib/customer/addresses";
import { readAddressCodes } from "@/lib/psgc";
import { runAction, type ActionResult } from "@/lib/action-result";

function parseAddressInput(formData: FormData): AddressInput {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const label = field("label");
  const recipientName = field("recipientName");
  const phone = field("phone");
  const street = field("street");
  const postalCode = field("postalCode");

  if (!label || !recipientName || !phone || !street || !postalCode) {
    throw new Error("All address fields are required.");
  }
  if (!/^\d{4}$/.test(postalCode)) {
    throw new Error("Please enter a 4-digit postal code.");
  }

  return {
    label,
    recipientName,
    phone,
    street,
    address2: field("address2"),
    postalCode,
    // The PSGC chain itself is validated in createAddress/updateAddress.
    location: readAddressCodes({
      regionCode: formData.get("regionCode"),
      provinceCode: formData.get("provinceCode"),
      cityCode: formData.get("cityCode"),
      barangayCode: formData.get("barangayCode"),
    }),
    isDefault: formData.get("isDefault") === "on",
  };
}

// (prevState, formData) so these plug straight into ActionForm's
// useActionState; checkout calls them directly with prevState = null.
export async function createAddressAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const email = await assertCustomer();
    await createAddress(email, parseAddressInput(formData));
    revalidatePath("/account/addresses");
  }, "Address saved.");
}

export async function updateAddressAction(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const email = await assertCustomer();
    await updateAddress(id, email, parseAddressInput(formData));
    revalidatePath("/account/addresses");
  }, "Address updated.");
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const email = await assertCustomer();
    await deleteAddress(id, email);
    revalidatePath("/account/addresses");
  }, "Address deleted.");
}
