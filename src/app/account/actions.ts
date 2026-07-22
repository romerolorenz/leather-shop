"use server";

import { revalidatePath } from "next/cache";
import { assertCustomer } from "@/lib/customer/auth";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressInput,
} from "@/lib/customer/addresses";
import { runAction, type ActionResult } from "@/lib/action-result";

function parseAddressInput(formData: FormData): AddressInput {
  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const barangay = String(formData.get("barangay") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();

  if (
    !label ||
    !recipientName ||
    !phone ||
    !street ||
    !barangay ||
    !city ||
    !postalCode
  ) {
    throw new Error("All address fields are required.");
  }

  return {
    label,
    recipientName,
    phone,
    street,
    address2,
    barangay,
    city,
    postalCode,
    isDefault: formData.get("isDefault") === "on",
  };
}

export async function createAddressAction(formData: FormData) {
  const email = await assertCustomer();
  await createAddress(email, parseAddressInput(formData));
  revalidatePath("/account/addresses");
}

export async function updateAddressAction(id: string, formData: FormData) {
  const email = await assertCustomer();
  await updateAddress(id, email, parseAddressInput(formData));
  revalidatePath("/account/addresses");
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const email = await assertCustomer();
    await deleteAddress(id, email);
    revalidatePath("/account/addresses");
  }, "Address deleted.");
}
