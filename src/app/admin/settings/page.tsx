import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";
const HINT_CLASS = "text-xs text-[#6E6A64] dark:text-[#A39C90]";
const SECTION_HEADING = "text-xs font-semibold uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Settings
      </h1>
      <p className={`mb-6 text-sm ${HINT_CLASS}`}>Shop-wide configuration.</p>

      <ActionForm action={updateSettingsAction} className="flex flex-col">
        <div className="pb-6">
          <p className={`mb-4 ${SECTION_HEADING}`}>Shipping &amp; Delivery</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="shippingFee">
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
                className={FIELD_CLASS}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="deliveryCities">
                Delivery cities (one per line)
              </label>
              <textarea
                id="deliveryCities"
                name="deliveryCities"
                rows={8}
                required
                defaultValue={settings.deliveryCities.join("\n")}
                className={`${FIELD_CLASS} font-mono`}
              />
            </div>
          </div>
        </div>

        <div className={`border-t ${HAIRLINE} py-6`}>
          <p className={`mb-4 ${SECTION_HEADING}`}>Notifications</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="adminNotificationEmail">
                Order notification email
              </label>
              <input
                id="adminNotificationEmail"
                name="adminNotificationEmail"
                type="email"
                required
                defaultValue={settings.adminNotificationEmail}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>

        <div className={`border-t ${HAIRLINE} py-6`}>
          <p className={`mb-4 ${SECTION_HEADING}`}>Payment</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="orderPaymentHoldHours">
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
                className={FIELD_CLASS}
              />
              <p className={HINT_CLASS}>
                An unpaid order auto-cancels and restores its stock after
                this many hours.
              </p>
            </div>
          </div>
        </div>

        <div className={`border-t ${HAIRLINE} py-6`}>
          <p className={`mb-4 ${SECTION_HEADING}`}>Contact</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="contactEmail">
                Contact Us email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                defaultValue={settings.contactEmail}
                className={FIELD_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="contactInstagramUrl">
                Contact Us Instagram URL
              </label>
              <input
                id="contactInstagramUrl"
                name="contactInstagramUrl"
                type="url"
                required
                defaultValue={settings.contactInstagramUrl}
                className={FIELD_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS} htmlFor="contactInstagramHandle">
                Instagram handle (shown as text)
              </label>
              <input
                id="contactInstagramHandle"
                name="contactInstagramHandle"
                type="text"
                required
                defaultValue={settings.contactInstagramHandle}
                placeholder="@yourshop"
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>

        <div className={`flex justify-end border-t ${HAIRLINE} pt-6`}>
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Save settings
          </SubmitButton>
        </div>
      </ActionForm>
    </main>
  );
}
