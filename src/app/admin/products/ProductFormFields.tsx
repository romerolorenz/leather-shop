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

export function ProductFormFields({
  categories,
  defaultValues = {},
}: {
  categories: { id: string; name: string }[];
  defaultValues?: Defaults;
}) {
  return (
    <>
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues.name}
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          defaultValue={defaultValues.description}
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="categoryId">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={defaultValues.categoryId ?? ""}
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
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
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Manage the list from{" "}
          <Link href="/admin/categories" className="underline">
            Admin / Categories
          </Link>
          .
        </p>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="price">
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
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="leadTimeDays">
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
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="stockQuantity">
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
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          One capacity number for the whole product — the same regardless of
          which option combination a customer picks. Never shown to
          customers.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="orderingEnabled"
          defaultChecked={defaultValues.orderingEnabled ?? true}
        />
        Ordering enabled
      </label>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={defaultValues.visible ?? true}
          />
          Visible in shop
        </label>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Unchecking this hides the product from the shop listing and
          search entirely (its page 404s) — different from disabling
          ordering, which still lists it as unavailable.
        </p>
      </div>
    </>
  );
}
