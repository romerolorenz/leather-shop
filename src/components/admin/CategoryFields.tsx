"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_DESCRIPTION_MAX } from "@/lib/category-description";

const FIELD_CLASS =
  "w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

// Fields for the "Add category" and "Edit category" pop-ups on
// /admin/categories (docs/design/category-descriptions.md § Admin).
// Controlled, so what the owner typed survives a rejected save (FormModal
// only remounts its form on success; React resets uncontrolled fields on
// every settle). The server re-checks the limit and normalises the text.
// Closing the pop-up without saving (Cancel, backdrop, Escape) puts the
// fields back to the saved values, so reopening never shows stale typing.
// A failed save keeps the dialog open, so the typed text survives that.
export function CategoryFields({
  idPrefix,
  defaultName = "",
  defaultDescription = "",
}: {
  idPrefix: string;
  defaultName?: string;
  defaultDescription?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const fieldRef = useRef<HTMLDivElement>(null);
  const saved = useRef({ name: defaultName, description: defaultDescription });
  useEffect(() => {
    saved.current = { name: defaultName, description: defaultDescription };
  }, [defaultName, defaultDescription]);

  useEffect(() => {
    const dialog = fieldRef.current?.closest("dialog");
    if (!dialog) return;
    // On a successful save FormModal also remounts the form with the new
    // values, so this reset is only visible after a close without saving.
    function reset() {
      setName(saved.current.name);
      setDescription(saved.current.description);
    }
    dialog.addEventListener("close", reset);
    return () => dialog.removeEventListener("close", reset);
  }, []);
  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;
  const helperId = `${descriptionId}-help`;
  const counterId = `${descriptionId}-count`;
  const atLimit = description.length >= CATEGORY_DESCRIPTION_MAX;

  return (
    <>
      <div ref={fieldRef} className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor={nameId}>
          Name
        </label>
        <input
          id={nameId}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Travel"
          required
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor={descriptionId}>
          Description <span className={`font-normal ${INK_SOFT}`}>(optional)</span>
        </label>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          maxLength={CATEGORY_DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A sentence or two shown under this category in the shop."
          aria-describedby={`${helperId} ${counterId}`}
          className={`${FIELD_CLASS} resize-y leading-relaxed`}
        />
        <div className="flex justify-between gap-3 text-xs">
          <p id={helperId} className={INK_SOFT}>
            Up to {CATEGORY_DESCRIPTION_MAX} characters. Leave blank to show
            nothing.
          </p>
          <p
            id={counterId}
            className={`flex-none tabular-nums ${
              atLimit ? "text-[#8A6415] dark:text-[#E0B052]" : INK_SOFT
            }`}
          >
            {description.length} / {CATEGORY_DESCRIPTION_MAX}
          </p>
        </div>
      </div>
    </>
  );
}
