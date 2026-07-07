import { createProductAction } from "../../actions";
import { ProductFormFields } from "../ProductFormFields";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function NewProductPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        New Product
      </h1>
      <form action={createProductAction} className="flex flex-col gap-4">
        <ProductFormFields />
        <button
          type="submit"
          className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Create product
        </button>
      </form>
    </main>
  );
}
