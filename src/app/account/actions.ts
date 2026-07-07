"use server";

import { revalidatePath } from "next/cache";
import { assertCustomer } from "@/lib/customer/auth";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressInput,
} from "@/lib/customer/addresses";

function parseAddressInput(formData: FormData): AddressInput {
  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!label || !recipientName || !phone || !street || !city) {
    throw new Error("All address fields are required.");
  }

  return {
    label,
    recipientName,
    phone,
    street,
    city,
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

export async function deleteAddressAction(id: string) {
  const email = await assertCustomer();
  await deleteAddress(id, email);
  revalidatePath("/account/addresses");
}
