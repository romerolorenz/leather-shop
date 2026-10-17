"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  AddressLocationFields,
  type LocationCodes,
} from "@/components/AddressLocationFields";
import type { ActionResult } from "@/lib/action-result";
import type { PsgcProvince, PsgcRegion } from "@/lib/psgc";

const FIELD_CLASS =
  "w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]";

type AddressFormValues = LocationCodes & {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  address2: string;
  postalCode: string;
  isDefault: boolean;
  // Saved before nationwide delivery and not fully matched to PSGC.
  needsUpdate: boolean;
};

// Shared by the "+ Add address" trigger and each address's edit-icon
// trigger — same dialog/form, different action + title + starting values.
export default function AddressFormModal({
  action,
  regions,
  provinces,
  title,
  submitLabel,
  defaultValues,
  variant,
}: {
  action: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  regions: PsgcRegion[];
  provinces: PsgcProvince[];
  title: string;
  submitLabel: string;
  defaultValues?: AddressFormValues;
  variant: "add" | "edit";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      {variant === "add" ? (
        <button
          type="button"
          onClick={open}
          className="whitespace-nowrap rounded-full border border-[rgba(28,26,24,.12)] px-4 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
        >
          + Add address
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-label="Edit address"
          className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-lg border border-[rgba(28,26,24,.12)] bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110] dark:text-[#F3F1EC]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <ActionForm
          action={action}
          onSuccess={close}
          className="flex flex-col gap-3"
        >
          {defaultValues?.needsUpdate && (
            <p className="text-sm text-[#7A3B22] dark:text-[#C97A4E]">
              We now deliver nationwide. Please pick this address&apos;s
              region, city and barangay from the lists.
            </p>
          )}
          <input
            name="label"
            defaultValue={defaultValues?.label}
            placeholder="Label (e.g. Home)"
            required
            className={FIELD_CLASS}
          />
          <input
            name="recipientName"
            defaultValue={defaultValues?.recipientName}
            placeholder="Recipient name"
            required
            className={FIELD_CLASS}
          />
          <input
            name="phone"
            defaultValue={defaultValues?.phone}
            placeholder="Phone"
            required
            className={FIELD_CLASS}
          />
          <input
            name="street"
            defaultValue={defaultValues?.street}
            placeholder="Address 1 (house/unit no., street name)"
            required
            className={FIELD_CLASS}
          />
          <input
            name="address2"
            defaultValue={defaultValues?.address2}
            placeholder="Apartment, suite, building (optional)"
            className={FIELD_CLASS}
          />
          <AddressLocationFields
            regions={regions}
            provinces={provinces}
            initial={defaultValues}
            fieldClass={FIELD_CLASS}
            labelClass=""
            showLabels={false}
            rowGapClass="gap-3"
            postalCodeField={
              <input
                name="postalCode"
                aria-label="Postal code"
                defaultValue={defaultValues?.postalCode}
                placeholder="Postal code"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                className={FIELD_CLASS}
              />
            }
          />
          <label className="flex items-center gap-2 text-sm text-[#6E6A64] dark:text-[#A39C90]">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={defaultValues?.isDefault}
            />
            Default address
          </label>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-[rgba(28,26,24,.12)] px-4 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
            >
              Cancel
            </button>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {submitLabel}
            </SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </>
  );
}
