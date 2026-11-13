import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { BrandLockup } from "@/components/logo";
import { getEventSettings } from "@/lib/event-settings";

export const metadata: Metadata = { title: "Privacy Policy" };
export const revalidate = 300;

export default async function PrivacyPage() {
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
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">
          How {settings.organiser_name} handles the information you submit while registering for{" "}
          {settings.event_name}.
        </p>

        <div className="prose-legal mt-10">
          <h2>What we collect</h2>
          <p>
            Team name, team size, college or organisation, city, state, selected track, and for each
            member: full name, email address, mobile number, college and team role. We also store the
            payment reference, order ID, amount, currency and payment status returned by the payment
            gateway.
          </p>

          <h2>What we never collect</h2>
          <p>
            We never receive or store card numbers, CVV codes, UPI PINs, netbanking credentials or
            any other payment instrument secrets. Those are entered directly on the payment
            gateway&apos;s hosted interface.
          </p>

          <h2>Why we collect it</h2>
          <ul>
            <li>To register your team and issue a permanent team ID.</li>
            <li>To verify your payment with the gateway before confirming the registration.</li>
            <li>To email the team leader the confirmation and PDF receipt.</li>
            <li>To contact the team leader about event logistics.</li>
            <li>To produce aggregate, non-identifying statistics about registrations.</li>
          </ul>

          <h2>Who can see it</h2>
          <p>
            Only authorised organizers can read participant records, and every access to the
            organizer dashboard is recorded in an audit log. Other participants can never read your
            team&apos;s information: the public confirmation page is accessible only through a
            private, unguessable link generated for your registration.
          </p>

          <h2>Storage and security</h2>
          <p>
            Registration data is stored in a dedicated, isolated schema in our database with Row
            Level Security enabled. Receipt PDFs are stored in private storage and served through
            short-lived signed links. Payment webhooks are verified cryptographically before any
            registration is confirmed.
          </p>

          <h2>Retention</h2>
          <p>
            Registration and payment records are retained for the duration of the event and for as
            long as required for accounting and audit purposes. Contact the organiser to request
            deletion of your personal data after the event.
          </p>

          <h2>Contact</h2>
          <p>
            {settings.contact_email
              ? `Questions about this policy can be sent to ${settings.contact_email}.`
              : "The organiser has not yet published a contact email. It will appear here and in the site footer once configured."}
          </p>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
