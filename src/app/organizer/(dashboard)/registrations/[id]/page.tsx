import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import { getRegistrationById } from "@/lib/registrations";
import { StatusPill } from "@/components/organizer/status-pill";
import { ResendEmailButton } from "@/components/organizer/resend-email-button";
import { TRACKS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegistrationDetailPage({ params }: { params: { id: string } }) {
  const registration = await getRegistrationById(params.id);
  if (!registration) notFound();

  const members = registration.registration_members ?? [];
  const payments = registration.registration_payments ?? [];
  const emails = ((registration as any).registration_emails ?? []) as any[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/organizer/registrations"
            className="inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-brand-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All registrations
          </Link>
          <h1 className="mt-2 flex items-center gap-3 text-xl font-bold">
            {registration.team_name}
            <span className="font-mono text-[13px] font-medium text-brand-300">
              {registration.team_id ?? "UNPAID"}
            </span>
          </h1>
          <p className="mt-1 text-[12.5px] text-slate-400">
            {registration.team_size} members · {TRACKS.find((t) => t.id === registration.track)?.name} ·{" "}
            {registration.college}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={registration.status} />
          {registration.status === "confirmed" ? (
            <>
              <a
                href={`/api/receipt/${registration.access_token}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-white hover:border-brand-500/40"
              >
                <Download className="h-3.5 w-3.5" /> Receipt PDF
              </a>
              <a
                href={`/receipt/${registration.access_token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-white hover:border-brand-500/40"
              >
                <Printer className="h-3.5 w-3.5" /> Print view
              </a>
              <ResendEmailButton registrationId={registration.id} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Team details
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Team name" value={registration.team_name} />
              <Row label="Team size" value={`${registration.team_size} members`} />
              <Row label="Team leader" value={registration.leader_name} />
              <Row label="Leader email" value={registration.leader_email} />
              <Row label="Leader phone" value={`+91 ${registration.leader_phone}`} />
              <Row label="College / organisation" value={registration.college} />
              <Row label="City" value={registration.city} />
              <Row label="State" value={registration.state} />
              <Row label="Track" value={TRACKS.find((t) => t.id === registration.track)?.name ?? registration.track} />
              <Row label="Amount" value={formatINR(registration.amount_paise, { withDecimals: true })} />
              <Row label="Created" value={formatDateTime(registration.created_at)} />
              <Row label="Confirmed" value={formatDateTime(registration.confirmed_at)} />
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Members
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10.5px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3 font-semibold">#</th>
                    <th className="py-2 pr-3 font-semibold">Name</th>
                    <th className="py-2 pr-3 font-semibold">Email</th>
                    <th className="py-2 pr-3 font-semibold">Phone</th>
                    <th className="py-2 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.05]">
                      <td className="py-2 pr-3 text-slate-500">{m.position}</td>
                      <td className="py-2 pr-3 text-slate-100">
                        {m.full_name}
                        {m.is_leader ? (
                          <span className="ml-1.5 rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-300">
                            Leader
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{m.email}</td>
                      <td className="py-2 pr-3 text-slate-400">+91 {m.phone}</td>
                      <td className="py-2 text-slate-400">{m.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Payment attempts
            </h2>
            {payments.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-slate-500">No payment records.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <StatusPill status={p.status} />
                      <span className="text-[12px] font-medium text-slate-200">
                        {formatINR(p.amount_paise, { withDecimals: true })}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-[11px]">
                      <MiniRow label="Order" value={p.provider_order_id} mono />
                      <MiniRow label="Payment" value={p.provider_payment_id ?? "—"} mono />
                      <MiniRow label="Gateway" value={p.provider} />
                      <MiniRow label="Method" value={p.method ?? "—"} />
                      <MiniRow label="Verified" value={formatDateTime(p.verified_at)} />
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Mail className="h-3.5 w-3.5" /> Email records
            </h2>
            {emails.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-slate-500">No email attempts recorded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {emails.map((e) => (
                  <li key={e.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-200">{e.recipient}</span>
                      <StatusPill status={e.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Sent {formatDateTime(e.sent_at)} · attempts {e.attempts}
                      {e.provider_message_id ? ` · ref ${e.provider_message_id}` : ""}
                    </p>
                    {e.error ? <p className="mt-1 text-[11px] text-red-300">{e.error}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] text-slate-100">{value}</dd>
    </div>
  );
}

function MiniRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right text-slate-300 ${mono ? "font-mono text-[10.5px]" : ""}`}>{value}</dd>
    </div>
  );
}
