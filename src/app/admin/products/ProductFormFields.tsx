import Link from "next/link";
import { CharCountTextarea } from "@/components/admin/CharCountTextarea";
import {
  CUSTOM_REQUEST_HELP_MAX,
  CUSTOM_REQUEST_LABEL_MAX,
  DEFAULT_CUSTOM_REQUEST_LABEL,
} from "@/lib/custom-request";

type Defaults = {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  leadTimeDays?: number;
  orderingEnabled?: boolean;
  visible?: boolean;
  stockQuantity?: number;
  dimensions?: string | null;
  details?: string | null;
  customRequestEnabled?: boolean;
  customRequestLabel?: string | null;
  customRequestHelp?: string | null;
};

const FIELD_CLASS =
  "w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]";
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";
const HINT_CLASS = "text-xs text-[#6E6A64] dark:text-[#A39C90]";

export function ProductFormFields({
  categories,
  defaultValues = {},
}: {
  categories: { id: string; name: string }[];
  defaultValues?: Defaults;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues.name}
          className={FIELD_CLASS}
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          defaultValue={defaultValues.description}
          className={FIELD_CLASS}
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <label className={LABEL_CLASS} htmlFor="categoryId">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={defaultValues.categoryId ?? ""}
          className={FIELD_CLASS}
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#6E6A64] dark:text-[#A39C90]">
          Manage the list from{" "}
          <Link
            href="/admin/categories"
            className="text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
          >
            Products / Categories
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="price">
          Price (₱)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={defaultValues.price}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="leadTimeDays">
          Lead time (days)
        </label>
        <input
          id="leadTimeDays"
          name="leadTimeDays"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={defaultValues.leadTimeDays ?? 0}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="stockQuantity">
          Stock (production capacity)
        </label>
        <input
          id="stockQuantity"
          name="stockQuantity"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={defaultValues.stockQuantity ?? 0}
          className={FIELD_CLASS}
        />
        <p className="text-xs text-[#6E6A64] dark:text-[#A39C90]">
          One capacity number for the whole product — the same regardless of
          which option combination a customer picks. Never shown to
          customers.
        </p>
      </div>

      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <label className={LABEL_CLASS} htmlFor="dimensions">
          Dimensions &amp; weight
        </label>
        <input
          id="dimensions"
          name="dimensions"
          placeholder="e.g. 32 × 24 × 14 cm · 620g"
          defaultValue={defaultValues.dimensions ?? ""}
          className={FIELD_CLASS}
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1">
        <label className={LABEL_CLASS} htmlFor="details">
          Details
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          placeholder="Materials, craftsmanship, care instructions, etc."
          defaultValue={defaultValues.details ?? ""}
          className={FIELD_CLASS}
        />
        <p className="text-xs text-[#6E6A64] dark:text-[#A39C90]">
          Both fields are optional — shown on the storefront as a &quot;Product
          Details&quot; section only when at least one is filled in.
        </p>
      </div>

      <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-2 sm:col-span-1">
        <label className="flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
          <input
            type="checkbox"
            name="orderingEnabled"
            defaultChecked={defaultValues.orderingEnabled ?? true}
          />
          Ordering enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={defaultValues.visible ?? true}
          />
          Visible in shop
        </label>
      </div>
      <p className="col-span-2 -mt-1 text-xs text-[#6E6A64] dark:text-[#A39C90]">
        Unchecking &quot;Visible&quot; hides the product from the shop
        listing and search entirely (its page 404s) — different from
        disabling ordering, which still lists it as unavailable.
      </p>

      {/* Special requests (docs/design/custom-requests.md §4). Label and
          helper stay editable while the box is unticked, so the copy can
          be prepared before switching it on. */}
      <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-[rgba(28,26,24,.12)] pt-4 dark:border-[rgba(243,241,236,.14)]">
        <p className="col-span-2 text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
          Special requests
        </p>
        <label className="col-span-2 flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
          <input
            type="checkbox"
            name="customRequestEnabled"
            defaultChecked={defaultValues.customRequestEnabled ?? false}
          />
          Let customers add a special request
        </label>
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="customRequestLabel">
            Label
          </label>
          <input
            id="customRequestLabel"
            name="customRequestLabel"
            maxLength={CUSTOM_REQUEST_LABEL_MAX}
            defaultValue={
              defaultValues.customRequestLabel ?? DEFAULT_CUSTOM_REQUEST_LABEL
            }
            aria-describedby="customRequestLabel-hint"
            className={FIELD_CLASS}
          />
          <p id="customRequestLabel-hint" className={HINT_CLASS}>
            Shown above the box on the product page.
          </p>
        </div>
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="customRequestHelp">
            Helper text
          </label>
          <CharCountTextarea
            id="customRequestHelp"
            name="customRequestHelp"
            rows={2}
            hardLimit={CUSTOM_REQUEST_HELP_MAX}
            defaultValue={defaultValues.customRequestHelp ?? ""}
            describedBy="customRequestHelp-hint"
            className={FIELD_CLASS}
          />
          <p id="customRequestHelp-hint" className={HINT_CLASS}>
            Optional. A short example of what you can adjust.
          </p>
        </div>
        <p className={`col-span-2 ${HINT_CLASS}`}>
          Shown only while ordering is enabled. Requests appear on the order
          in Orders. The line under the box is set once for the whole shop
          in{" "}
          <Link
            href="/admin/settings"
            className="text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
          >
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
