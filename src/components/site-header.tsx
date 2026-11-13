"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { BrandLockup } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/#home" },
  { label: "About", href: "/#about" },
  { label: "Tracks", href: "/#tracks" },
  { label: "Registration", href: "/#registration" },
  { label: "FAQs", href: "/#faqs" },
  { label: "Contact", href: "/#contact" },
];

export function SiteHeader({ registrationsOpen }: { registrationsOpen: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-white/10 bg-ink-950/85 backdrop-blur-xl"
          : "border-transparent bg-ink-950/40 backdrop-blur-md",
      )}
    >
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Link href="/" aria-label="Zelvora Registration Portal home" className="flex items-center">
          <BrandLockup size={40} priority />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!registrationsOpen ? (
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:inline">
              Registrations closed
            </span>
          ) : null}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/12 text-slate-200 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="lg:hidden">
          <div className="container-page border-t border-white/10 py-4">
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 text-[15px] font-medium text-slate-200 hover:bg-white/[0.06]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <Button asChild size="lg" className="mt-4 w-full">
              <Link href="/register" onClick={() => setOpen(false)}>
                Register Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
