import { getSettings } from "@/lib/settings";
import { getCustomerEmail } from "@/lib/customer/auth";
import { listAddresses } from "@/lib/customer/addresses";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const [settings, customerEmail] = await Promise.all([
    getSettings(),
    getCustomerEmail(),
  ]);
  const savedAddresses = customerEmail
    ? await listAddresses(customerEmail)
    : [];

  return (
    <CheckoutForm
      cities={settings.deliveryCities}
      shippingFeeCentavos={settings.shippingFeeCentavos}
      customerEmail={customerEmail ?? undefined}
      savedAddresses={savedAddresses}
    />
  );
}
