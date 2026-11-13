import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Users, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZelvoraLogo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { calculateFee, isRegistrationWindowOpen } from "@/lib/pricing";
import { formatDate, formatINR } from "@/lib/utils";
import type { EventSettings } from "@/lib/types";

export function Hero({ settings }: { settings: EventSettings }) {
  const open = isRegistrationWindowOpen(settings);
  const from = calculateFee(2, settings);

  return (
    <section id="home" className="relative overflow-hidden">
      <div className="grid-backdrop" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] rounded-full bg-brand-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-brand-800/20 blur-[120px]"
      />

      <div className="container-page relative grid gap-14 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-20">
        <div>
          <Reveal>
            <span className="eyebrow">
              <span className="relative flex h-2 w-2">
                {open ? (
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-400" />
                ) : null}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${open ? "bg-brand-400" : "bg-slate-500"}`}
                />
              </span>
              {open ? "Registrations open" : "Registrations closed"}
              <span className="text-brand-300/60">·</span>
              Hackathon 2026
            </span>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-6 font-display text-[clamp(2.9rem,8vw,5.2rem)] font-extrabold leading-[0.94] tracking-[-0.03em]">
              <span className="text-gradient">ZELVORA REGISTRATION PORTAL</span>
            </h1>
            <p className="mt-4 font-display text-[clamp(1.15rem,3.2vw,1.6rem)] font-semibold tracking-tight text-white/90">
              Build. Innovate. Transform.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-400">
              Bring your ideas to life, collaborate with talented innovators, and build solutions
              that make a difference. Organised by {settings.organiser_name}.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {open ? (
                <Button asChild size="lg">
                  <Link href="/register">
                    Register your team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" disabled>
                  Registrations are closed
                </Button>
              )}
              <Button asChild size="lg" variant="secondary">
                <Link href="/#tracks">Explore tracks</Link>
              </Button>
            </div>
            <p className="mt-4 text-[12.5px] text-slate-500">
              Teams of 2–4 · Registration from {formatINR(from.totalPaise)} · Confirmation and
              receipt issued instantly after payment
            </p>
          </Reveal>

          <Reveal delay={240}>
            <dl className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-4">
              {[
                { icon: Layers, label: "Tracks", value: "4" },
                { icon: Users, label: "Team size", value: "2–4" },
                { icon: Sparkles, label: "Entry from", value: formatINR(from.basePaise) },
              ].map((s) => (
                <div key={s.label} className="px-4 text-center sm:px-5">
                  <s.icon className="mx-auto mb-2 h-4 w-4 text-brand-400" aria-hidden />
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {s.label}
                  </dt>
                  <dd className="mt-1 font-display text-lg font-bold text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={140} className="relative">
          <div className="relative mx-auto max-w-md">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2.2rem] opacity-60 blur-2xl"
              style={{
                background:
                  "conic-gradient(from 140deg, rgba(1,246,211,0.30), rgba(0,164,194,0.10), rgba(1,246,211,0.28), rgba(1,246,211,0.30))",
              }}
            />
            <div className="relative overflow-hidden rounded-[1.9rem] border border-white/12 bg-ink-900/85 p-7 shadow-card backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Official organiser
                </span>
                <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-200">
                  Verified
                </span>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <ZelvoraLogo size={196} rounded="rounded-3xl" priority />
                <p className="mt-5 text-center font-display text-[13px] font-semibold uppercase tracking-[0.22em] text-white/80">
                  Zelvora Technologies
                </p>
                <p className="mt-1 text-center text-[11px] uppercase tracking-[0.18em] text-brand-300/70">
                  Pvt. Ltd.
                </p>
              </div>

              <div className="mt-7 space-y-2.5 border-t border-white/10 pt-5">
                <InfoRow
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Event dates"
                  value={
                    settings.event_start
                      ? `${formatDate(settings.event_start)}${settings.event_end ? ` – ${formatDate(settings.event_end)}` : ""}`
                      : "To be announced"
                  }
                />
                <InfoRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Venue"
                  value={settings.venue ?? "To be announced"}
                />
                <InfoRow
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Registration closes"
                  value={
                    settings.registration_deadline
                      ? formatDate(settings.registration_deadline)
                      : "Announced by organiser"
                  }
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="flex items-center gap-2 text-slate-500">
        <span className="text-brand-400">{icon}</span>
        {label}
      </span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}
