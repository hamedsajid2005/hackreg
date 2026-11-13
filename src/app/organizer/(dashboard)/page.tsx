import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Clock,
  IndianRupee,
  Users,
  XCircle,
} from "lucide-react";
import { getDashboardStats, listRegistrations } from "@/lib/registrations";
import { getEventSettings } from "@/lib/event-settings";
import { TRACKS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";
import { ExportMenu } from "@/components/organizer/export-menu";
import { WindowToggle } from "@/components/organizer/window-toggle";
import { StatusPill } from "@/components/organizer/status-pill";

export const dynamic = "force-dynamic";

export default async function OrganizerOverviewPage() {
  const [stats, settings, recent] = await Promise.all([
    getDashboardStats(),
    getEventSettings(),
    listRegistrations({ page: 1, pageSize: 8 }),
  ]);

  const cards = [
    {
      label: "Total registrations",
      value: String(stats.totalRegistrations),
      icon: Users,
      hint: `${stats.paidRegistrations} paid · ${stats.pendingRegistrations} pending`,
    },
    {
      label: "Confirmed revenue",
      value: formatINR(stats.confirmedRevenuePaise),
      icon: IndianRupee,
      hint: "Sum of verified payments only",
    },
    {
      label: "Confirmed participants",
      value: String(stats.totalParticipants),
      icon: BadgeCheck,
      hint: "Across paid teams",
    },
    {
      label: "Failed payments",
      value: String(stats.failedPayments),
      icon: XCircle,
      hint: "Registrations with a failed attempt",
    },
  ];

  const maxSize = Math.max(1, ...stats.byTeamSize.map((s) => s.count));
  const maxTrack = Math.max(1, ...stats.byTrack.map((t) => t.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Overview</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Live figures from the registration database. Only verified payments count as revenue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WindowToggle open={settings.registrations_open} />
          <ExportMenu scope="all" />
        </div>
      </div>

      {!settings.registrations_open ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 text-[12.5px] text-amber-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Registration is currently <strong>closed</strong> on the public site. Reopen it from
            Settings when you are ready to accept teams.
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-brand-400/80" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-[11.5px] text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-[13px] font-semibold text-white">Team-size distribution</h2>
          <ul className="mt-4 space-y-3">
            {stats.byTeamSize.map((row) => (
              <li key={row.size}>
                <div className="flex items-center justify-between text-[12px] text-slate-400">
                  <span>{row.size} members</span>
                  <span className="font-medium text-slate-200">{row.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(row.count / maxSize) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-[13px] font-semibold text-white">Track-wise distribution</h2>
          <ul className="mt-4 space-y-3">
            {stats.byTrack.map((row) => (
              <li key={row.track}>
                <div className="flex items-center justify-between text-[12px] text-slate-400">
                  <span>{TRACKS.find((t) => t.id === row.track)?.name ?? row.track}</span>
                  <span className="font-medium text-slate-200">{row.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(row.count / maxTrack) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-[13px] font-semibold text-white">Latest registrations</h2>
          <Link
            href="/organizer/registrations"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-300 hover:text-brand-200"
          >
            Manage all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-3 font-semibold">Team ID</th>
                <th className="px-5 py-3 font-semibold">Team</th>
                <th className="px-5 py-3 font-semibold">Leader</th>
                <th className="px-5 py-3 font-semibold">Size</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Registered</th>
              </tr>
            </thead>
            <tbody>
              {recent.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No registrations yet. Once teams pay, they appear here.
                  </td>
                </tr>
              ) : (
                recent.rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-[12px] text-brand-300">
                      {row.team_id ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-200">
                      <Link
                        href={`/organizer/registrations/${row.id}`}
                        className="hover:text-brand-300"
                      >
                        {row.team_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{row.leader_name}</td>
                    <td className="px-5 py-3 text-slate-400">{row.team_size}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDateTime(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


