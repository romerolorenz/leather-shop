"use client";

import { useState } from "react";

// Textarea with a live "n / limit" counter that turns warning-colour past
// a *soft* limit — going over is still allowed (e.g. the homepage studio
// quote, docs/design/studio-profile.md §6). Controlled, so what the admin
// typed survives a rejected save: ActionForm only remounts its children
// on success, while React resets uncontrolled fields either way.
// `hardLimit` instead makes the limit a hard stop (maxLength), e.g. a
// product's special-request helper text (custom-requests.md §4).
export function CharCountTextarea({
  id,
  name,
  rows,
  defaultValue,
  softLimit,
  hardLimit,
  className,
  describedBy,
}: {
  id: string;
  name: string;
  rows: number;
  defaultValue: string;
  softLimit?: number;
  hardLimit?: number;
  className?: string;
  describedBy?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const limit = hardLimit ?? softLimit ?? 0;
  const over = hardLimit === undefined && value.length > limit;
  const counterId = `${id}-count`;

  return (
    <>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={hardLimit}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby={[describedBy, counterId].filter(Boolean).join(" ")}
        className={className}
      />
      <p
        id={counterId}
        className={`text-right text-xs tabular-nums ${
          over ? "text-[#8A6415]" : "text-[#6E6A64] dark:text-[#A39C90]"
        }`}
      >
        {value.length} / {limit}
      </p>
    </>
  );
}
