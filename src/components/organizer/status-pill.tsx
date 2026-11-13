export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    pending_payment: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    successful: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    failed: "border-red-500/30 bg-red-500/10 text-red-300",
    expired: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
        map[status] ?? "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
