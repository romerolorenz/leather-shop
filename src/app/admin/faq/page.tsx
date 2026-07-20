import { listFaqItemsForAdmin } from "@/lib/admin/faq";
import {
  createFaqItemAction,
  updateFaqItemAction,
  deleteFaqItemAction,
  reorderFaqItemsAction,
} from "../actions";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { FormModal } from "@/components/admin/FormModal";
import { ActionButton } from "@/components/ActionButton";
import { DragReorderList } from "@/components/admin/DragReorderList";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

const CONTENT_TABS = [
  { label: "Homepage", href: "/admin/homepage" },
  { label: "FAQ", href: "/admin/faq" },
];

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

export default async function AdminFaqPage() {
  const items = await listFaqItemsForAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Content
      </h1>
      <p className={`mb-6 text-sm ${INK_SOFT}`}>
        Homepage and FAQ copy shown to customers.
      </p>
      <SectionTabs items={CONTENT_TABS} />

      <div className="mb-4 flex justify-end">
        <FormModal
          title="Add FAQ item"
          action={createFaqItemAction}
          submitLabel="Add FAQ item"
          triggerLabel="Add FAQ item"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="new-faq-question">
              Question
            </label>
            <input
              id="new-faq-question"
              name="question"
              placeholder="Question"
              required
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="new-faq-answer">
              Answer
            </label>
            <textarea
              id="new-faq-answer"
              name="answer"
              placeholder="Answer"
              required
              rows={3}
              className={FIELD_CLASS}
            />
          </div>
        </FormModal>
      </div>

      {items.length > 0 ? (
        <DragReorderList
          items={items}
          onReorder={reorderFaqItemsAction}
          className="flex flex-col gap-3"
          itemClassName={`rounded-lg border ${HAIRLINE} p-4`}
        >
          {items.map((item) => {
            const updateItem = updateFaqItemAction.bind(null, item.id);
            const removeItem = deleteFaqItemAction.bind(null, item.id);

            return (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
                    {item.question}
                  </p>
                  <p className={`mt-1 line-clamp-2 text-sm ${INK_SOFT}`}>
                    {item.answer}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-1">
                  <FormModal
                    title="Edit FAQ item"
                    action={updateItem}
                    submitLabel="Save changes"
                    triggerLabel="Edit FAQ item"
                    triggerVariant="icon-edit"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor={`faq-question-${item.id}`}>
                        Question
                      </label>
                      <input
                        id={`faq-question-${item.id}`}
                        name="question"
                        defaultValue={item.question}
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor={`faq-answer-${item.id}`}>
                        Answer
                      </label>
                      <textarea
                        id={`faq-answer-${item.id}`}
                        name="answer"
                        defaultValue={item.answer}
                        required
                        rows={3}
                        className={FIELD_CLASS}
                      />
                    </div>
                  </FormModal>
                  <ActionButton
                    action={removeItem}
                    confirmMessage="Delete this FAQ item?"
                    ariaLabel="Delete FAQ item"
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
        <p className={`text-sm ${INK_SOFT}`}>No FAQ items yet.</p>
      )}
    </main>
  );
}
