import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us — Leather Shop",
};

export default async function ContactPage() {
  const { contactEmail, contactInstagramUrl, contactInstagramHandle } =
    await getSettings();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        Contact Us
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Have a question, or want to order for delivery outside Metro Manila?
        Send us a message below, or reach out directly:
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex items-center gap-2 underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 flex-none"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          {contactEmail}
        </a>
        <a
          href={contactInstagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 flex-none"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <path d="M17.5 6.5h.01" />
          </svg>
          {contactInstagramHandle}
        </a>
      </div>

      <ContactForm />
    </main>
  );
}
