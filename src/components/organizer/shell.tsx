"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCog,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { ZelvoraLogo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/organizer", label: "Overview", icon: LayoutDashboard },
  { href: "/organizer/registrations", label: "Registrations", icon: Users },
  { href: "/organizer/settings", label: "Settings", icon: CalendarCog },
];

export function OrganizerShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await createBrowserSupabase().auth.signOut();
      router.replace("/organizer/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[248px] border-r border-white/10 bg-ink-900/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4">
          <ZelvoraLogo size={34} />
          <div className="leading-none">
            <p className="font-display text-[12px] font-bold tracking-[0.14em] text-white">
              ZELVORA REGISTRATION PORTAL
            </p>
            <p className="mt-1 text-[9.5px] uppercase tracking-[0.14em] text-brand-300/70">
              Organizer
            </p>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="ml-auto text-slate-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/organizer"
                ? pathname === "/organizer"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-brand-500/12 text-white ring-1 ring-brand-500/25"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-brand-400" : "text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="truncate text-[12px] font-medium text-slate-200">{email}</p>
            <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-slate-500">{role}</p>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-2.5 flex w-full items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11.5px] font-medium text-slate-300 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-ink-950/85 px-4 backdrop-blur-xl lg:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-white/12 p-2 text-slate-300 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-[12.5px] text-slate-400">
            ZELVORA REGISTRATION PORTAL
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-slate-200">
              {NAV.find((n) =>
                n.href === "/organizer" ? pathname === n.href : pathname.startsWith(n.href),
              )?.label ?? "Overview"}
            </span>
          </p>
          <Link
            href="/"
            className="ml-auto hidden rounded-lg border border-white/12 px-3 py-1.5 text-[11.5px] font-medium text-slate-300 hover:border-brand-500/40 hover:text-white sm:inline-block"
          >
            View public site
          </Link>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
