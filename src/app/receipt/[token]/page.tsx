import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ZelvoraLogo } from "@/components/logo";
import { PrintButton } from "@/components/registration/print-button";
import { getRegistrationByToken } from "@/lib/registrations";
import { getEventSettings } from "@/lib/event-settings";
import { TRACKS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Registration Receipt",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Print-friendly HTML receipt. The PDF version is generated server-side and
 *  stored privately in Supabase Storage. */
export default async function ReceiptPage({ params }: { params: { token: string } }) {
  const [registration, settings] = await Promise.all([
    getRegistrationByToken(params.token),
    getEventSettings(),
  ]);
  if (!registration || registration.status !== "confirmed") notFound();

  const payment = registration.registration_payments?.find((p) => p.status === "successful");
  const track = TRACKS.find((t) => t.id === registration.track);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/confirmation/${params.token}`} className="text-[12.5px] text-slate-400 hover:text-brand-300">
          <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back to confirmation
        </Link>
        <PrintButton />
      </div>

      <article className="print-plain rounded-2xl border border-white/10 bg-white p-8 text-[#0B1016] sm:p-10">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <ZelvoraLogo size={72} rounded="rounded-xl" />
            <div>
              <p className="font-display text-lg font-extrabold tracking-[0.12em] text-[#0B1016]">
                {settings.event_name}
              </p>
              <p className="text-[11.5px] text-slate-600">{settings.tagline}</p>
              <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {settings.organiser_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Registration receipt
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1016]">
              {registration.team_id}
            </p>
            <p className="text-[11px] text-slate-500">
              {formatDateTime(registration.confirmed_at ?? registration.created_at)}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Row label="Team name" value={registration.team_name} />
          <Row label="Team size" value={`${registration.team_size} members`} />
          <Row label="Team leader" value={registration.leader_name} />
          <Row label="Leader email" value={registration.leader_email} />
          <Row label="Selected track" value={track?.name ?? registration.track} />
          <Row label="College / organisation" value={registration.college} />
          <Row label="City / State" value={`${registration.city}, ${registration.state}`} />
          <Row label="Registration status" value="CONFIRMED" />
        </section>

        <section className="mt-7">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Team members
          </h2>
          <table className="mt-2 w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 font-semibold">College</th>
              </tr>
            </thead>
            <tbody>
              {(registration.registration_members ?? []).map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-500">{m.position}</td>
                  <td className="py-2 pr-3 font-medium">
                    {m.full_name}
                    {m.is_leader ? (
                      <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                        Leader
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{m.role}</td>
                  <td className="py-2 text-slate-600">{m.college}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-7 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-600">Amount paid</span>
            <span className="font-display text-lg font-extrabold">
              {formatINR(registration.amount_paise, { withDecimals: true })}
            </span>
          </div>
          <div className="mt-3 grid gap-x-8 gap-y-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <Row label="Currency" value={registration.currency} small />
            <Row label="Payment status" value={(payment?.status ?? "successful").toUpperCase()} small />
            <Row label="Payment reference" value={payment?.provider_payment_id ?? "—"} small />
            <Row label="Order ID" value={payment?.provider_order_id ?? "—"} small />
            <Row label="Payment gateway" value={(payment?.provider ?? "razorpay").toUpperCase()} small />
            <Row label="Payment time" value={formatDateTime(payment?.verified_at ?? null)} small />
          </div>
        </section>

        <footer className="mt-7 border-t border-slate-200 pt-4">
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            This receipt confirms that <strong>{registration.team_name}</strong> is registered for{" "}
            {settings.event_name}, organised by {settings.organiser_name}, with team ID{" "}
            <strong>{registration.team_id}</strong>. The payment above was verified by the payment
            gateway against the order created for this registration.
          </p>
          <p className="mt-2 text-[10.5px] text-slate-500">
            Computer-generated receipt · No signature required · Keep this for your records
          </p>
        </footer>
      </article>
    </main>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={small ? "text-[12px] text-slate-700" : "text-[13px] font-medium text-slate-900"}>
        {value}
      </p>
    </div>
  );
}
