import { Archivo } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { assertCustomer } from "@/lib/customer/auth";
import { listAddresses } from "@/lib/customer/addresses";
import {
  createAddressAction,
  updateAddressAction,
  deleteAddressAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import AddressFormModal from "./AddressFormModal";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default async function AddressesPage() {
  const email = await assertCustomer();
  const [addresses, settings] = await Promise.all([
    listAddresses(email),
    getSettings(),
  ]);
  const cities = settings.deliveryCities;

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "My Account", href: "/account" },
            { label: "Saved addresses" },
          ]}
        />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Saved addresses
        </h1>

        <ul className="mb-8 divide-y divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]">
          {addresses.map((address) => {
            const updateThis = updateAddressAction.bind(null, address.id);
            const removeThis = deleteAddressAction.bind(null, address.id);

            return (
              <li key={address.id} className="py-6 first:pt-0">
                <div className="mb-2 flex items-center justify-between">
                  {address.isDefault ? (
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#7A3B22] dark:text-[#C97A4E]">
                      Default
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <AddressFormModal
                      action={updateThis}
                      cities={cities}
                      title="Edit address"
                      submitLabel="Save changes"
                      variant="edit"
                      defaultValues={{
                        label: address.label,
                        recipientName: address.recipientName,
                        phone: address.phone,
                        street: address.street,
                        city: address.city,
                        isDefault: address.isDefault,
                      }}
                    />
                    <form action={removeThis}>
                      <button
                        type="submit"
                        aria-label="Delete address"
                        className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
                <p className="font-semibold">{address.label}</p>
                <p className="text-sm">
                  {address.recipientName} · {address.phone}
                </p>
                <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
                  {address.street}, {address.city}
                </p>
              </li>
            );
          })}
          {addresses.length === 0 && (
            <li className="py-6 text-sm text-[#6E6A64] first:pt-0 dark:text-[#A39C90]">
              No saved addresses yet.
            </li>
          )}
        </ul>

        <AddressFormModal
          action={createAddressAction}
          cities={cities}
          title="Add address"
          submitLabel="Add address"
          variant="add"
        />
      </div>
    </main>
  );
}
