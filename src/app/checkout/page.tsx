import { getSettings } from "@/lib/settings";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <CheckoutForm
      cities={settings.deliveryCities}
      shippingFeeCentavos={settings.shippingFeeCentavos}
    />
  );
}
