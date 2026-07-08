import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us — Leather Shop",
};

export default async function ContactPage() {
  const { contactEmail, contactInstagramUrl } = await getSettings();

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
        <a href={`mailto:${contactEmail}`} className="underline">
          {contactEmail}
        </a>
        <a
          href={contactInstagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Instagram
        </a>
      </div>

      <ContactForm />
    </main>
  );
}
