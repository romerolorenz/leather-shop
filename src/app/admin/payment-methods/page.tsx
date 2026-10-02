import { listPaymentMethods } from "@/lib/admin/payment-methods";
import { getSettings } from "@/lib/settings";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
  deletePaymentMethodAction,
  reorderPaymentMethodsAction,
  updatePaymentInstructionsAction,
} from "../actions";
import { FormModal } from "@/components/admin/FormModal";
import { ActionButton } from "@/components/ActionButton";
import { DragReorderList } from "@/components/admin/DragReorderList";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";
const SECTION_HEADING = "text-xs font-semibold uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]";
const FILE_INPUT_CLASS =
  "flex-1 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background hover:file:bg-[#383838] active:file:opacity-70 dark:hover:file:bg-[#ccc]";

function TrashIcon() {
  return (
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
  );
}

// One flat list — no bank-vs-e-wallet distinction. QR upload is optional
// and per-entry; the file input is never `required`, and on edit shows the
// entry's current QR (if set) so the admin can see what's live before
// choosing whether to replace it.
function PaymentMethodFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults?: {
    label: string;
    accountName: string;
    accountNumber: string;
    qrImageUrl: string | null;
  };
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-label`}>
          Label
        </label>
        <input
          id={`${idPrefix}-label`}
          name="label"
          placeholder="e.g. BDO or GCash"
          defaultValue={defaults?.label}
          required
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-accountName`}>
          Account name
        </label>
        <input
          id={`${idPrefix}-accountName`}
          name="accountName"
          defaultValue={defaults?.accountName}
          required
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-accountNumber`}>
          Account number
        </label>
        <input
          id={`${idPrefix}-accountNumber`}
          name="accountNumber"
          defaultValue={defaults?.accountNumber}
          required
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-qrImage`}>
          QR code (optional)
        </label>
        {defaults?.qrImageUrl && (
          // QR code is a plain uploaded image, no focal point/crop concept.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={defaults.qrImageUrl}
            alt="Current QR code"
            width={80}
            height={80}
            className={`mb-1 rounded-md border ${HAIRLINE} object-contain`}
          />
        )}
        <input
          id={`${idPrefix}-qrImage`}
          type="file"
          name="qrImage"
          accept="image/*"
          className={FILE_INPUT_CLASS}
        />
      </div>
    </>
  );
}

// QR files go browser → Storage directly (src/lib/direct-upload.ts);
// the create/update actions only receive the resulting `qrImagePath`.
const QR_DIRECT_UPLOAD = {
  field: "qrImage",
  target: { kind: "payment-qr" },
} as const;

export default async function AdminPaymentMethodsPage() {
  const [paymentMethods, settings] = await Promise.all([
    listPaymentMethods(),
    getSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Payment Methods
      </h1>
      <p className={`mb-6 text-sm ${INK_SOFT}`}>
        Shop-wide payment info sent to a customer via the &quot;Send payment
        details&quot; action on an order — same for every order, not
        per-order.
      </p>

      {/* ─── Payment methods ────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <p className={SECTION_HEADING}>Payment methods</p>
          <FormModal
            title="Add payment method"
            action={createPaymentMethodAction}
            directUpload={QR_DIRECT_UPLOAD}
            submitLabel="Add payment method"
            triggerLabel="Add payment method"
          >
            <PaymentMethodFields idPrefix="new-method" />
          </FormModal>
        </div>

        {paymentMethods.length > 0 ? (
          <DragReorderList
            items={paymentMethods}
            onReorder={reorderPaymentMethodsAction}
            className="flex flex-col gap-3"
            itemClassName={`rounded-lg border ${HAIRLINE} p-4`}
          >
            {paymentMethods.map((method) => {
              const updateMethod = updatePaymentMethodAction.bind(null, method.id);
              const removeMethod = deletePaymentMethodAction.bind(null, method.id);

              return (
                <div key={method.id} className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {method.qrImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={method.qrImageUrl}
                        alt={`${method.label} QR code`}
                        width={40}
                        height={40}
                        className={`flex-none rounded-md border ${HAIRLINE} object-contain`}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
                        {method.label}
                      </p>
                      <p className={`mt-1 text-sm ${INK_SOFT}`}>
                        {method.accountName} — {method.accountNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <FormModal
                      title="Edit payment method"
                      action={updateMethod}
                      directUpload={QR_DIRECT_UPLOAD}
                      submitLabel="Save changes"
                      triggerLabel="Edit payment method"
                      triggerVariant="icon-edit"
                    >
                      <PaymentMethodFields idPrefix={`edit-${method.id}`} defaults={method} />
                    </FormModal>
                    <ActionButton
                      action={removeMethod}
                      confirmMessage="Delete this payment method?"
                      ariaLabel="Delete payment method"
                      className="rounded-md p-1.5 text-[#8C3B32] transition-transform hover:bg-[rgba(140,59,50,.1)] active:scale-95 disabled:opacity-50 dark:text-[#E08A78]"
                    >
                      <TrashIcon />
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </DragReorderList>
        ) : (
          <p className={`text-sm ${INK_SOFT}`}>No payment methods yet.</p>
        )}
      </section>

      {/* ─── Instructions ───────────────────────────────────────────── */}
      <section>
        <p className={`mb-2 ${SECTION_HEADING}`}>Instructions</p>
        <p className={`mb-4 text-sm ${INK_SOFT}`}>
          Free-form text shown after the payment methods list above —
          deadlines, reference-number format, anything else.
        </p>

        <ActionForm action={updatePaymentInstructionsAction} className="flex flex-col gap-3">
          <textarea
            name="paymentInstructionsText"
            aria-label="Payment instructions"
            rows={5}
            defaultValue={settings.paymentInstructionsText}
            placeholder="Deadlines, reference-number format, anything else the customer should know."
            className={FIELD_CLASS}
          />
          <div className="flex justify-end">
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Save instructions
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
