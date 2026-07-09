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
import AddAddressModal from "./AddAddressModal";

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
                <div className="mb-3 flex items-center justify-between">
                  {address.isDefault ? (
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#7A3B22] dark:text-[#C97A4E]">
                      Default
                    </span>
                  ) : (
                    <span />
                  )}
                  <form action={removeThis} className="ml-auto">
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
                <form action={updateThis} className="flex flex-col gap-2">
                  <input
                    name="label"
                    defaultValue={address.label}
                    required
                    placeholder="Label (e.g. Home)"
                    className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm font-medium dark:border-[rgba(243,241,236,.14)]"
                  />
                  <input
                    name="recipientName"
                    defaultValue={address.recipientName}
                    required
                    placeholder="Recipient name"
                    className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
                  />
                  <input
                    name="phone"
                    defaultValue={address.phone}
                    required
                    placeholder="Phone"
                    className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
                  />
                  <input
                    name="street"
                    defaultValue={address.street}
                    required
                    placeholder="Street address"
                    className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
                  />
                  <select
                    name="city"
                    defaultValue={address.city}
                    required
                    className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                    <input
                      type="checkbox"
                      name="isDefault"
                      defaultChecked={address.isDefault}
                    />
                    Default address
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      aria-label="Save address"
                      className="rounded-md p-1.5 transition-transform hover:bg-black/[.05] active:scale-95 dark:hover:bg-white/[.1]"
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
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                        <path d="M17 21v-8H7v8" />
                        <path d="M7 3v5h8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
          {addresses.length === 0 && (
            <li className="py-6 text-sm text-[#6E6A64] first:pt-0 dark:text-[#A39C90]">
              No saved addresses yet.
            </li>
          )}
        </ul>

        <AddAddressModal
          createAddressAction={createAddressAction}
          cities={cities}
        />
      </div>
    </main>
  );
}
