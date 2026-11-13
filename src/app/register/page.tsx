import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { getEventSettings } from "@/lib/event-settings";
import { isRegistrationWindowOpen } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Team Registration",
  description:
    "Register your team of 2–4 members for ZELVORA REGISTRATION PORTAL. Choose your track, add member details and pay securely.",
};

export const revalidate = 30;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { track?: string; size?: string; resume?: string };
}) {
  const settings = await getEventSettings();
  const open = isRegistrationWindowOpen(settings);
  const size = searchParams.size ? Number(searchParams.size) : undefined;

  return (
    <>
      <SiteHeader registrationsOpen={open} />
      <main className="relative overflow-hidden pb-20">
        <div className="grid-backdrop" aria-hidden />
        <div className="container-page relative pt-12">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-slate-500">
            <Link href="/" className="hover:text-brand-300">
              Home
            </Link>
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-slate-300">Registration</span>
          </nav>

          <div className="mt-6 max-w-2xl">
            <span className="eyebrow">Team registration</span>
            <h1 className="mt-5 text-[clamp(1.9rem,4.6vw,2.75rem)] font-bold leading-[1.08]">
              Register your team for <span className="text-gradient">{settings.event_name}</span>
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-400">
              Three short steps. Your team ID and receipt are issued automatically once your payment
              is verified by the gateway.
            </p>
          </div>

          <div className="mt-10">
            <RegistrationWizard
              settings={settings}
              initialTrack={searchParams.track}
              initialSize={size}
              resumeToken={searchParams.resume}
            />
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
