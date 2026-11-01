"use client";

import { useId } from "react";
import {
  CUSTOM_REQUEST_MAX,
  CUSTOM_REQUEST_NEAR_LIMIT,
} from "@/lib/custom-request";

const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

// The optional special-request box on the product page
// (docs/design/custom-requests.md §1 and §7). Styled like the option
// dropdown so it reads as one more row in the list of choices. The limit
// is a hard stop (maxLength), so it's never an error state: no red, no
// validation message.
export function CustomRequestField({
  label,
  help,
  expectation,
  value,
  onChange,
}: {
  label: string;
  help: string | null;
  // Shop-wide setting (custom_request_note); blank = no line.
  expectation: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const fieldId = `${id}-request`;
  const helpId = `${id}-help`;
  const expectationId = `${id}-expect`;
  const counterId = `${id}-count`;

  // Counted like maxLength counts, so the counter and the hard stop agree.
  const length = value.length;
  const atLimit = length >= CUSTOM_REQUEST_MAX;
  const nearLimit = length >= CUSTOM_REQUEST_NEAR_LIMIT;
  // Spoken only when a threshold is crossed (the text changes only then);
  // the visible counter isn't a live region, so typing isn't announced.
  const announcement = atLimit
    ? "Character limit reached"
    : nearLimit
      ? `${CUSTOM_REQUEST_MAX - CUSTOM_REQUEST_NEAR_LIMIT} characters left`
      : "";

  const describedBy = [help && helpId, expectation && expectationId, counterId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-6">
      <label className="text-sm font-medium" htmlFor={fieldId}>
        {label} <span className={`font-normal ${INK_SOFT}`}>Optional</span>
      </label>
      {help && (
        <p id={helpId} className={`mt-1 max-w-[60ch] text-sm ${INK_SOFT}`}>
          {help}
        </p>
      )}
      <textarea
        id={fieldId}
        rows={3}
        maxLength={CUSTOM_REQUEST_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Navy thread, strap 2 cm longer"
        aria-describedby={describedBy}
        // 16px text: anything smaller makes iOS Safari zoom in on focus.
        className="mt-2 block w-full resize-y rounded-btn border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-base focus:border-[#1C1A18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1A18] dark:border-[rgba(243,241,236,.14)]"
      />
      <div className={`mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs ${INK_SOFT}`}>
        {expectation && (
          <p id={expectationId} className="min-w-0 flex-[1_1_220px]">
            {expectation}
          </p>
        )}
        <span
          id={counterId}
          className={`ml-auto flex-none tabular-nums ${
            nearLimit ? "font-medium text-[#1C1A18] dark:text-[#F3F1EC]" : ""
          }`}
        >
          {atLimit
            ? `${CUSTOM_REQUEST_MAX} / ${CUSTOM_REQUEST_MAX} · Limit reached`
            : `${length} / ${CUSTOM_REQUEST_MAX}`}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
