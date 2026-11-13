import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Suspense } from "react";
import { listRegistrations, type RegistrationFilters as Filters } from "@/lib/registrations";
import { RegistrationFilters } from "@/components/organizer/registration-filters";
import { ExportMenu } from "@/components/organizer/export-menu";
import { StatusPill } from "@/components/organizer/status-pill";
import { TRACKS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  teamSize?: string;
  track?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters: Filters = {
    q: searchParams.q,
    teamSize: searchParams.teamSize ? Number(searchParams.teamSize) : undefined,
    track: searchParams.track,
    status: searchParams.status,
    paymentStatus: searchParams.paymentStatus,
    from: searchParams.from,
    to: searchParams.to,
    page: searchParams.page ? Number(searchParams.page) : 1,
    pageSize: 25,
  };

  let data;
  let error: string | null = null;
  try {
    data = await listRegistrations(filters);
  } catch {
    error = "Could not load registrations. Check the database connection.";
    data = { rows: [], total: 0, page: 1, pageSize: 25, pageCount: 1 };
  }

  const queryString = new URLSearchParams(
    Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][],
  ).toString();

  const pageLink = (page: number) => {
    const params = new URLSearchParams(queryString);
    params.set("page", String(page));
    return `/organizer/registrations?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Registrations</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            {data.total} record{data.total === 1 ? "" : "s"} · page {data.page} of {data.pageCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu scope={queryString ? "filtered" : "all"} query={queryString} />
        </div>
      </div>

      <Suspense fallback={<div className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />}>
        <RegistrationFilters />
      </Suspense>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[12.5px] text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3 font-semibold">Team ID</th>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 font-semibold">Leader</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Track</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No registrations match these filters.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => {
                  const payment = (row.registration_payments ?? [])[0];
                  return (
                    <tr key={row.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[12px] text-brand-300">
                        {row.team_id ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/organizer/registrations/${row.id}`}
                          className="font-medium text-slate-100 hover:text-brand-300"
                        >
                          {row.team_name}
                        </Link>
                        <p className="text-[11px] text-slate-500">{row.college}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {row.leader_name}
                        <p className="text-[11px] text-slate-500">{row.leader_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.team_size}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {TRACKS.find((t) => t.id === row.track)?.short ?? row.track}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={payment?.status ?? "pending"} />
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatINR(row.amount_paise)}</td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-500">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/organizer/registrations/${row.id}`}
                          className="text-[11.5px] font-semibold text-brand-300 hover:text-brand-200"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <p className="text-[11.5px] text-slate-500">
            Showing {data.rows.length} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={pageLink(Math.max(1, data.page - 1))}
              aria-disabled={data.page <= 1}
              className={`inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11.5px] ${
                data.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-brand-500/40"
              }`}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Link>
            <Link
              href={pageLink(Math.min(data.pageCount, data.page + 1))}
              aria-disabled={data.page >= data.pageCount}
              className={`inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11.5px] ${
                data.page >= data.pageCount ? "pointer-events-none opacity-40" : "hover:border-brand-500/40"
              }`}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Download className="h-3 w-3" /> Exports reflect live database rows for the current filters.
      </p>
    </div>
  );
}
