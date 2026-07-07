import { getSettings } from "@/lib/settings";
import CartView from "./CartView";

export default async function CartPage() {
  const { shippingFeeCentavos } = await getSettings();
  return <CartView shippingFeeCentavos={shippingFeeCentavos} />;
}
