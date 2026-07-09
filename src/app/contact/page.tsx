import { Archivo } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import ContactForm from "./ContactForm";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Contact Us — Leather Shop",
};

export default async function ContactPage() {
  const { contactEmail, contactInstagramUrl, contactInstagramHandle } =
    await getSettings();

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
        />
        <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Contact Us
        </h1>
        <p className="text-[#6E6A64] dark:text-[#A39C90]">
          Have a question, or want to order for delivery outside Metro Manila?
          Send us a message below, or reach out directly:
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center gap-2 text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
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
            className="inline-flex items-center gap-2 text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
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
      </div>
    </main>
  );
}
