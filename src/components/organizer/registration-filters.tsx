"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { TRACKS } from "@/lib/constants";

export function RegistrationFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState(params.get("q") ?? "");

  const apply = (next: URLSearchParams) => {
    next.delete("page");
    router.push(`/organizer/registrations?${next.toString()}`);
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  };

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    apply(next);
  };

  const clear = () => {
    setQ("");
    router.push("/organizer/registrations");
  };

  const activeCount = ["q", "teamSize", "track", "status", "paymentStatus", "from", "to"].filter(
    (k) => params.get(k),
  ).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearch} className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team ID, team name, leader name or email"
            className="pl-9"
            aria-label="Search registrations"
          />
        </form>
        <Button type="button" variant="secondary" size="md" onClick={() => setOpen((v) => !v)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount ? (
            <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-ink-950">
              {activeCount}
            </span>
          ) : null}
        </Button>
        {activeCount ? (
          <Button type="button" variant="ghost" size="md" onClick={clear}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Team size
            </span>
            <Select
              value={params.get("teamSize") ?? ""}
              onChange={(e) => setParam("teamSize", e.target.value)}
            >
              <option value="">Any</option>
              <option value="2">2 members</option>
              <option value="3">3 members</option>
              <option value="4">4 members</option>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Track
            </span>
            <Select value={params.get("track") ?? ""} onChange={(e) => setParam("track", e.target.value)}>
              <option value="">Any</option>
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Registration status
            </span>
            <Select
              value={params.get("status") ?? ""}
              onChange={(e) => setParam("status", e.target.value)}
            >
              <option value="">Any</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending_payment">Pending payment</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Payment status
            </span>
            <Select
              value={params.get("paymentStatus") ?? ""}
              onChange={(e) => setParam("paymentStatus", e.target.value)}
            >
              <option value="">Any</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                From
              </span>
              <Input
                type="date"
                value={params.get("from") ?? ""}
                onChange={(e) => setParam("from", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                To
              </span>
              <Input
                type="date"
                value={params.get("to") ?? ""}
                onChange={(e) => setParam("to", e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
