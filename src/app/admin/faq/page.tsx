import { listFaqItemsForAdmin } from "@/lib/admin/faq";
import {
  createFaqItemAction,
  updateFaqItemAction,
  deleteFaqItemAction,
  moveFaqItemAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AdminFaqPage() {
  const items = await listFaqItemsForAdmin();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "FAQ" }]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">FAQ</h1>

      <ul className="mb-10 flex flex-col gap-4">
        {items.map((item, index) => {
          const updateItem = updateFaqItemAction.bind(null, item.id);
          const removeItem = deleteFaqItemAction.bind(null, item.id);
          const moveUp = moveFaqItemAction.bind(null, item.id, "up");
          const moveDown = moveFaqItemAction.bind(null, item.id, "down");

          return (
            <li
              key={item.id}
              className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <form action={moveUp}>
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label="Move up"
                      className="rounded-md border border-black/[.15] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[.2]"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveDown}>
                    <button
                      type="submit"
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                      className="rounded-md border border-black/[.15] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[.2]"
                    >
                      ↓
                    </button>
                  </form>
                </div>
                <ActionButton
                  action={removeItem}
                  confirmMessage="Delete this FAQ item?"
                  ariaLabel="Delete FAQ item"
                  className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
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
                </ActionButton>
              </div>
              <ActionForm action={updateItem} className="flex flex-col gap-2">
                <input
                  name="question"
                  defaultValue={item.question}
                  aria-label="Question"
                  required
                  className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm font-medium dark:border-white/[.2]"
                />
                <textarea
                  name="answer"
                  defaultValue={item.answer}
                  aria-label="Answer"
                  required
                  rows={3}
                  className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
                />
                <div className="flex gap-3">
                  <SubmitButton
                    ariaLabel="Save FAQ item"
                    className="rounded-md p-1.5 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
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
                  </SubmitButton>
                </div>
              </ActionForm>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">No FAQ items yet.</li>
        )}
      </ul>

      <h2 className="mb-4 text-sm font-medium">Add FAQ item</h2>
      <ActionForm action={createFaqItemAction} className="flex flex-col gap-3">
        <input
          name="question"
          placeholder="Question"
          required
          className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
        />
        <textarea
          name="answer"
          placeholder="Answer"
          required
          rows={3}
          className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
        />
        <SubmitButton
          pendingLabel="Adding…"
          className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
        >
          Add FAQ item
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
