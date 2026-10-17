import { getSettings } from "@/lib/settings";
import { getCustomerEmail } from "@/lib/customer/auth";
import { listAddresses } from "@/lib/customer/addresses";
import { listProvinces, listRegions } from "@/lib/psgc";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const [settings, customerEmail, regions, provinces] = await Promise.all([
    getSettings(),
    getCustomerEmail(),
    listRegions(),
    listProvinces(),
  ]);
  const savedAddresses = customerEmail
    ? await listAddresses(customerEmail)
    : [];

  return (
    <CheckoutForm
      regions={regions}
      provinces={provinces}
      shippingFeeCentavos={settings.shippingFeeCentavos}
      customerEmail={customerEmail ?? undefined}
      savedAddresses={savedAddresses}
    />
  );
}
