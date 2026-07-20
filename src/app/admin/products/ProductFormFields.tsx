import Link from "next/link";

type Defaults = {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  leadTimeDays?: number;
  orderingEnabled?: boolean;
  visible?: boolean;
  stockQuantity?: number;
};

const FIELD_CLASS =
  "w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]";
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";

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
    </div>
  );
}
