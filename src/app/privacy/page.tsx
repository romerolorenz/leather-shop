import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = {
  title: "Privacy Policy — Leather Shop",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Privacy Policy
      </h1>

      <div className="flex flex-col gap-6 text-zinc-600 dark:text-zinc-400">
        <section>
          <h2 className="mb-2 font-medium text-foreground">
            What we collect
          </h2>
          <p>
            When you place an order, we collect your name, email address,
            phone number, and delivery address. If you log in with Google,
            we receive your name, email address, and profile photo from
            your Google account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            How we use it
          </h2>
          <p>
            We use this information to fulfill and deliver your order,
            contact you about payment and shipping, and — if you have an
            account — show you your order history. We do not sell your
            information to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            Where it&apos;s stored
          </h2>
          <p>
            Order and account data is stored with Supabase, our database
            and authentication provider. Emails about your order are sent
            through Resend. Both providers process data on our behalf and
            don&apos;t use it for their own purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-foreground">
            Your rights
          </h2>
          <p>
            You can ask us what information we hold about you, request a
            correction, or ask us to delete it, subject to what we need to
            keep for order/tax records. Reach out via the Contact Us page
            for any of these requests.
          </p>
        </section>

        <p className="text-sm">Last updated: 2026-07-07.</p>
      </div>
    </main>
  );
}
