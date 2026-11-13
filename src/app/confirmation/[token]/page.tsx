import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { ZelvoraLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PendingWatcher } from "@/components/registration/pending-watcher";
import { getRegistrationByToken } from "@/lib/registrations";
import { getEventSettings } from "@/lib/event-settings";
import { TRACKS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Registration Confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: { token: string } }) {
  const [registration, settings] = await Promise.all([
    getRegistrationByToken(params.token),
    getEventSettings(),
  ]);

  if (!registration) notFound();

  const track = TRACKS.find((t) => t.id === registration.track);
  const payment = registration.registration_payments?.[0];
  const confirmed = registration.status === "confirmed" && Boolean(registration.team_id);
  const members = registration.registration_members ?? [];

  return (
    <>
      <header className="no-print border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ZelvoraLogo size={38} />
            <span className="font-display text-[13px] font-bold tracking-[0.16em] text-white">
              ZELVORA REGISTRATION PORTAL
            </span>
          </Link>
          <Link href="/" className="text-[12.5px] text-slate-400 hover:text-brand-300">
            Back to site
          </Link>
        </div>
      </header>

      <main className="container-page max-w-3xl py-12">
        {confirmed ? (
          <div className="print-plain rounded-2xl border border-brand-500/25 bg-ink-900/70 p-6 shadow-card sm:p-9">
            <div className="flex flex-col items-center text-center">
              <ZelvoraLogo size={96} rounded="rounded-2xl" />
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Registration successful
              </span>
              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
                Welcome to {settings.event_name}
              </h1>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-400">
                Your payment has been verified by the gateway. This registration is confirmed and
                your team ID is permanent.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-brand-500/30 bg-brand-gradient p-[1px]">
                <div className="rounded-[calc(1rem-1px)] bg-ink-950 px-6 py-5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                    Your team ID
                  </p>
                  <p className="mt-1 font-display text-4xl font-extrabold tracking-[0.06em] text-white">
                    {registration.team_id}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">{registration.team_name}</p>
                </div>
              </div>
            </div>

            <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <Detail label="Team name" value={registration.team_name} />
              <Detail label="Team size" value={`${registration.team_size} members`} />
              <Detail label="Team leader" value={registration.leader_name} />
              <Detail label="Track" value={track?.name ?? registration.track} />
              <Detail
                label="College / organisation"
                value={registration.college}
              />
              <Detail
                label="City / State"
                value={`${registration.city}, ${registration.state}`}
              />
              <Detail
                label="Amount paid"
                value={formatINR(registration.amount_paise, { withDecimals: true })}
              />
              <Detail
                label="Payment reference"
                value={payment?.provider_payment_id ?? payment?.provider_order_id ?? "—"}
              />
              <Detail
                label="Registration date & time"
                value={formatDateTime(registration.confirmed_at ?? registration.created_at)}
              />
              <Detail
                label="Payment status"
                value={(payment?.status ?? "successful").toUpperCase()}
              />
            </dl>

            <div className="mt-7 border-t border-white/10 pt-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Registered members
              </h2>
              <ul className="mt-3 divide-y divide-white/[0.07]">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-[13.5px] text-slate-200">
                      {m.full_name}
                      {m.is_leader ? (
                        <span className="ml-2 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-brand-300">
                          Leader
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[12px] text-slate-500">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="no-print mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={`/api/receipt/${registration.access_token}`}>
                  <Download className="h-4 w-4" /> Download PDF receipt
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href={`/receipt/${registration.access_token}`}>
                  <Printer className="h-4 w-4" /> Print receipt
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/">Back to home</Link>
              </Button>
            </div>

            <p className="no-print mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
              A confirmation email with your receipt has been sent to {registration.leader_email}.
              This page is private — bookmark it, but do not share the link.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 sm:p-9">
            <div className="flex flex-col items-center text-center">
              <ZelvoraLogo size={80} rounded="rounded-2xl" />
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                <Clock className="h-3.5 w-3.5" /> Payment pending
              </span>
              <h1 className="mt-4 text-2xl font-bold">We have not received your payment yet</h1>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-400">
                {registration.team_name} is registered but not confirmed. No team ID is issued and no
                confirmation email is sent until the gateway confirms the payment.
              </p>
            </div>

            <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <Detail label="Team name" value={registration.team_name} />
              <Detail label="Team size" value={`${registration.team_size} members`} />
              <Detail label="Amount due" value={formatINR(registration.amount_paise)} />
              <Detail label="Started" value={formatDateTime(registration.created_at)} />
              <Detail label="Payment status" value={(payment?.status ?? "pending").toUpperCase()} />
              <Detail label="Order reference" value={payment?.provider_order_id ?? "—"} />
            </dl>

            <PendingWatcher token={registration.access_token} />

            <div className="no-print mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/register?resume=${registration.access_token}`}>
                  Return to payment
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" /> Back to home
                </Link>
              </Button>
            </div>

            <p className="no-print mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              If money was debited from your account, do not pay again. Contact the organiser with
              the order reference above and it will be reconciled.
            </p>
          </div>
        )}
      </main>

      <div className="no-print">
        <SiteFooter settings={settings} />
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] font-medium text-slate-100">{value}</dd>
    </div>
  );
}
