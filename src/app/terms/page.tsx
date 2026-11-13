import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { BrandLockup } from "@/components/logo";
import { getEventSettings } from "@/lib/event-settings";

export const metadata: Metadata = { title: "Terms & Conditions" };
export const revalidate = 300;

export default async function TermsPage() {
  const settings = await getEventSettings();
  return (
    <>
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center">
          <Link href="/">
            <BrandLockup size={38} />
          </Link>
        </div>
      </header>
      <main className="container-page max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
        <p className="mt-3 text-sm text-slate-500">
          Registration terms for {settings.event_name}, organised by {settings.organiser_name}.
        </p>

        <div className="prose-legal mt-10">
          <h2>1. Registration</h2>
          <p>
            A registration is complete only when the payment gateway confirms a successful payment
            for the full amount calculated by our server. Submitting the form, uploading a payment
            screenshot, or completing a payment on the gateway without server-side confirmation does
            not constitute a confirmed registration.
          </p>

          <h2>2. Team composition</h2>
          <p>
            Teams must contain between two and four members. The number of member records submitted
            must exactly match the team size declared. One member is designated team leader and is
            the primary point of contact; the confirmation email and receipt are sent to the team
            leader&apos;s email address.
          </p>

          <h2>3. Fees</h2>
          <p>
            Registration fees are charged once per team: ₹299 for two members, ₹499 for three members
            and ₹699 for four members, plus any tax configured by the organiser at the time of
            payment. The amount payable is recalculated server-side for every order; the value shown
            in the browser is an estimate only.
          </p>

          <h2>4. Team IDs</h2>
          <p>
            Team IDs are issued sequentially after verified payment, are unique, and are permanent
            once assigned. No team ID is issued for an unpaid, failed, cancelled or expired payment.
          </p>

          <h2>5. Refunds</h2>
          <p>
            Refunds are handled at the organiser&apos;s discretion under the payment gateway&apos;s
            settlement rules. Where a payment was debited but the registration was not confirmed,
            contact the organiser with your payment reference so it can be reconciled.
          </p>

          <h2>6. Conduct</h2>
          <p>
            Teams must submit original work. Plagiarism, use of another team&apos;s submission, or
            misrepresentation of member details may lead to disqualification without refund.
          </p>

          <h2>7. Changes to the event</h2>
          <p>
            The organiser may change the schedule, format, tracks or judging criteria and will
            publish any change on this website and by email to registered team leaders. Event dates,
            venue and prizes are published only once confirmed.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            {settings.organiser_name} is not liable for failures of third-party payment
            infrastructure, network outages, or devices beyond its control, but will make reasonable
            efforts to reconcile any payment that was debited without a confirmed registration.
          </p>

          <h2>9. Contact</h2>
          <p>
            {settings.contact_email
              ? `For any question about these terms, write to ${settings.contact_email}.`
              : "The organiser has not yet published a contact email. It will appear here once configured."}
          </p>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
