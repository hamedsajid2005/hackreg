import { getEventSettings } from "@/lib/event-settings";
import { SettingsForm } from "@/components/organizer/settings-form";
import { WindowToggle } from "@/components/organizer/window-toggle";

export const dynamic = "force-dynamic";

export default async function OrganizerSettingsPage() {
  const settings = await getEventSettings();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Public event details, registration window, fees and contact information. Nothing here is
            pre-filled with invented dates or contact details — publish only what is confirmed.
          </p>
        </div>
        <WindowToggle open={settings.registrations_open} />
      </div>

      <SettingsForm settings={settings} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Audit trail
        </h2>
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
          Settings changes, registration window changes, payment confirmations, email resends and
          exports are recorded in{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11.5px] text-brand-200">
            zelvation.registration_audit_logs
          </code>{" "}
          with the acting organizer, action, entity and metadata. Query it from the Supabase SQL
          editor when you need a full history.
        </p>
      </section>
    </div>
  );
}
