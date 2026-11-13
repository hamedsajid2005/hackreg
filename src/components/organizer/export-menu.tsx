"use client";

import * as React from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Export menu. Every option hits /api/organizer/export, which re-checks the
 * organizer session server-side and builds the file from live database rows.
 */
export function ExportMenu({ scope = "all", query = "" }: { scope?: "all" | "filtered"; query?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const href = (format: string, kind: string) =>
    `/api/organizer/export?format=${format}&scope=${scope}&kind=${kind}${query ? `&${query}` : ""}`;

  const items = [
    { label: "Full workbook (4 sheets)", kind: "workbook", format: "xlsx", icon: FileSpreadsheet },
    { label: "Team registrations (CSV)", kind: "teams", format: "csv", icon: FileText },
    { label: "Member details (CSV)", kind: "members", format: "csv", icon: Users },
    { label: "Payment details (CSV)", kind: "payments", format: "csv", icon: FileText },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-white/12 bg-ink-850 shadow-card">
          <p className="border-b border-white/[0.07] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {scope === "filtered" ? "Filtered registrations" : "All registrations"}
          </p>
          {items.map((item) => (
            <a
              key={item.kind + item.format}
              href={href(item.format, item.kind)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-slate-200 transition-colors hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-3.5 w-3.5 text-brand-400" />
              {item.label}
            </a>
          ))}
          <p className="border-t border-white/[0.07] px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
            Exports contain participant personal data. Every export is written to the audit log.
          </p>
        </div>
      ) : null}
    </div>
  );
}
