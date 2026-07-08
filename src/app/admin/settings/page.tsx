import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Shop Settings" }]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Shop Settings
      </h1>
      <ActionForm action={updateSettingsAction} className="flex flex-col gap-6">
        <div>
          <label className="text-sm font-medium" htmlFor="shippingFee">
            Shipping fee (₱)
          </label>
          <input
            id="shippingFee"
            name="shippingFee"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={(settings.shippingFeeCentavos / 100).toFixed(2)}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="deliveryCities">
            Delivery cities (one per line)
          </label>
          <textarea
            id="deliveryCities"
            name="deliveryCities"
            rows={10}
            required
            defaultValue={settings.deliveryCities.join("\n")}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.2]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium"
            htmlFor="adminNotificationEmail"
          >
            Order notification email
          </label>
          <input
            id="adminNotificationEmail"
            name="adminNotificationEmail"
            type="email"
            required
            defaultValue={settings.adminNotificationEmail}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium"
            htmlFor="orderPaymentHoldHours"
          >
            Order payment hold (hours)
          </label>
          <input
            id="orderPaymentHoldHours"
            name="orderPaymentHoldHours"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={settings.orderPaymentHoldHours}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            An unpaid order auto-cancels and restores its stock after this
            many hours.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="contactEmail">
            Contact Us email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            defaultValue={settings.contactEmail}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium"
            htmlFor="contactInstagramUrl"
          >
            Contact Us Instagram URL
          </label>
          <input
            id="contactInstagramUrl"
            name="contactInstagramUrl"
            type="url"
            required
            defaultValue={settings.contactInstagramUrl}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium"
            htmlFor="contactInstagramHandle"
          >
            Contact Us Instagram handle (shown as text, e.g. @yourshop)
          </label>
          <input
            id="contactInstagramHandle"
            name="contactInstagramHandle"
            type="text"
            required
            defaultValue={settings.contactInstagramHandle}
            className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
          />
        </div>

        <SubmitButton
          pendingLabel="Saving…"
          className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Save settings
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
