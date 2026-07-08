type Defaults = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  leadTimeDays?: number;
  orderingEnabled?: boolean;
  visible?: boolean;
  stockQuantity?: number;
};

export function ProductFormFields({
  defaultValues = {},
}: {
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
        <label className="text-sm font-medium" htmlFor="category">
          Category
        </label>
        <input
          id="category"
          name="category"
          required
          defaultValue={defaultValues.category}
          className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
        />
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
