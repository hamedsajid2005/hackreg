import { Megaphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Tracks } from "@/components/landing/tracks";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { getEventSettings } from "@/lib/event-settings";
import { isRegistrationWindowOpen } from "@/lib/pricing";

export const revalidate = 60;

export default async function LandingPage() {
  const settings = await getEventSettings();
  const open = isRegistrationWindowOpen(settings);

  return (
    <>
      <SiteHeader registrationsOpen={open} />
      {settings.announcement ? (
        <div className="border-b border-brand-500/20 bg-brand-500/[0.07]">
          <div className="container-page flex items-center gap-3 py-2.5 text-[12.5px] text-brand-100">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden />
            <p className="truncate">{settings.announcement}</p>
          </div>
        </div>
      ) : null}
      <main id="main">
        <Hero settings={settings} />
        <About />
        <Tracks />
        <HowItWorks />
        <Pricing settings={settings} />
        <Faq />
        <Contact settings={settings} />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
