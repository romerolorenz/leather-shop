import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-32 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Handcrafted leather, made in small batches.
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Brand story placeholder — swap in real photography and copy once
        brand assets are ready.
      </p>
      <Link
        href="/products"
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Shop the collection
      </Link>
    </main>
  );
}
