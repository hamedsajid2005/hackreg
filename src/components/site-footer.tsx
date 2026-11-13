import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ZelvoraLogo } from "@/components/logo";
import type { EventSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: EventSettings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-8 border-t border-white/10 bg-ink-900/60">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <ZelvoraLogo size={104} rounded="rounded-2xl" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">
              {settings.event_name} is a national hackathon organised by {settings.organiser_name}.
              Build with intent, ship with craft.
            </p>
            <p className="mt-4 font-display text-sm font-semibold tracking-[0.14em] text-brand-300">
              {settings.tagline}
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Explore
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {[
                ["About", "/#about"],
                ["Tracks", "/#tracks"],
                ["Pricing", "/#pricing"],
                ["FAQs", "/#faqs"],
                ["Register", "/register"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="transition-colors hover:text-brand-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Organiser
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>{settings.organiser_name}</li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-brand-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-brand-300">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/organizer/login" className="transition-colors hover:text-brand-300">
                  Organizer Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              {settings.contact_email ? (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <a href={`mailto:${settings.contact_email}`} className="hover:text-brand-300">
                    {settings.contact_email}
                  </a>
                </li>
              ) : null}
              {settings.contact_phone ? (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <a href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} className="hover:text-brand-300">
                    {settings.contact_phone}
                  </a>
                </li>
              ) : null}
              {settings.contact_address ? (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>{settings.contact_address}</span>
                </li>
              ) : null}
              {!settings.contact_email && !settings.contact_phone && !settings.contact_address ? (
                <li className="text-slate-500">
                  Contact details are published by the organiser from the organizer dashboard.
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.organiser_name}. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
            Payments verified server-side · Receipts stored privately
          </p>
        </div>
      </div>
    </footer>
  );
}
