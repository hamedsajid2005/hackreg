import Link from "next/link";
import { ArrowRight, Mail, MapPin, MapPinned, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import type { EventSettings } from "@/lib/types";

export function Contact({ settings }: { settings: EventSettings }) {
  const email = "info@zelvoratech.com";
  const phone = "9100040993";

  return (
    <section id="contact" className="section relative border-t border-white/[0.06] bg-ink-900/40">
      <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <span className="eyebrow">Contact</span>
          <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
            Still have a <span className="text-gradient">question</span>?
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-400">
            The Zelvora Technologies team handles every registration query. Include your team ID or
            payment reference so we can look up your registration quickly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Start registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href={`mailto:${email}`}>Email the organiser</a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="surface p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquare className="h-4 w-4 text-brand-400" aria-hidden />
              Organiser contact
            </h3>
            <dl className="mt-5 space-y-4">
              <ContactRow icon={<Mail className="h-4 w-4" />} label="Email">
                <a href={`mailto:${email}`} className="hover:text-brand-300">
                  {email}
                </a>
              </ContactRow>
              <ContactRow icon={<MapPin className="h-4 w-4" />} label="Address">
                Telangana, Hyderabad, India
              </ContactRow>
              <ContactRow icon={<MapPinned className="h-4 w-4" />} label="Location">
                Hyderabad, IN
              </ContactRow>
              <ContactRow icon={<Phone className="h-4 w-4" />} label="Company Contact Number">
                <a href={`tel:+91${phone}`} className="hover:text-brand-300">
                  {phone}
                </a>
              </ContactRow>
              <ContactRow icon={<Mail className="h-4 w-4" />} label="Organiser">
                {settings.organiser_name}
              </ContactRow>
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-400">{icon}</span>
      <div>
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </dt>
        <dd className="mt-0.5 text-[13.5px] text-slate-200">{children}</dd>
      </div>
    </div>
  );
}
