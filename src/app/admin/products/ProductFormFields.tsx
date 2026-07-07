type Defaults = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  leadTimeDays?: number;
  orderingEnabled?: boolean;
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="orderingEnabled"
          defaultChecked={defaultValues.orderingEnabled ?? true}
        />
        Ordering enabled
      </label>
    </>
  );
}
