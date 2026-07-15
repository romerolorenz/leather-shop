"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import type { ActionResult } from "@/lib/action-result";

function GripIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}

// Native HTML5 drag-and-drop reorder, shared by /admin/faq, a product's
// attached options, and the homepage's featured products — replaces the
// swap-adjacent ↑/↓ button pairs those three lists used before. Only the
// grip handle is draggable (not the whole row), so text inputs/textareas/
// buttons inside each row's content stay normally interactive — the
// handle's onMouseDown flips `draggable` on for just that row.
//
// Takes `children` as an array of pre-rendered nodes (one per item, same
// order as `items`) rather than a `renderItem` render-prop — the pages
// using this are Server Components, and a Server Component can't pass a
// plain function to a Client Component (RSC only serializes elements/
// values, not closures; see ActionForm.tsx's note on the same
// constraint). Matched back to `items` by id via a Map so the optimistic
// drag order can reshuffle which content renders where.
//
// Reorders optimistically, then calls onReorder with the full dropped
// order; on failure it reverts to the last server-provided order and
// toasts the error (mirrors ActionButton's toast treatment).
export function DragReorderList<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
  itemClassName,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => Promise<ActionResult>;
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
}) {
  const [order, setOrder] = useState(items);
  // Re-sync from the server-provided order when it changes (e.g. the page
  // re-rendered after an add/delete elsewhere) — adjusted during render
  // rather than in an effect, per React's guidance on deriving state from
  // props, so it doesn't cost an extra render pass.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const contentByItemId = new Map(
    items.map((item, index) => [item.id, children[index]])
  );

  function handleDrop(targetId: string) {
    const fromId = draggedId;
    setDraggedId(null);
    setGrabbedId(null);
    if (!fromId || fromId === targetId) return;

    const fromIndex = order.findIndex((item) => item.id === fromId);
    const toIndex = order.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...order];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrder(next);

    startTransition(async () => {
      const result = await onReorder(next.map((item) => item.id));
      if (!result.success) setOrder(items);
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Reordered." }
          : { type: "error", message: result.error }
      );
    });
  }

  return (
    <ul className={className}>
      {order.map((item) => (
        <li
          key={item.id}
          draggable={grabbedId === item.id}
          onDragStart={(e) => {
            setDraggedId(item.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setGrabbedId(null);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(item.id);
          }}
          className={`flex items-start gap-2 ${itemClassName ?? ""} ${
            draggedId === item.id ? "opacity-40" : ""
          }`}
        >
          <span
            onMouseDown={() => setGrabbedId(item.id)}
            onMouseUp={() => setGrabbedId(null)}
            aria-label="Drag to reorder"
            className="mt-1 shrink-0 cursor-grab touch-none rounded-md p-1 text-[#6E6A64] active:cursor-grabbing dark:text-[#A39C90]"
          >
            <GripIcon />
          </span>
          <div className="min-w-0 flex-1">{contentByItemId.get(item.id)}</div>
        </li>
      ))}
    </ul>
  );
}
