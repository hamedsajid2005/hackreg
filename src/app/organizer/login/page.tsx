import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ZelvoraLogo } from "@/components/logo";
import { LoginForm } from "@/components/organizer/login-form";

export const metadata: Metadata = {
  title: "Organizer Login",
  robots: { index: false, follow: false },
};

export default function OrganizerLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <ZelvoraLogo size={112} rounded="rounded-2xl" priority />
          <h1 className="mt-6 text-xl font-bold">Organizer Portal</h1>
          <p className="mt-1.5 text-[13px] text-slate-400">
            ZELVORA REGISTRATION PORTAL · Zelvora Technologies Pvt. Ltd.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-6 shadow-card sm:p-7">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] text-slate-500">
          <Link href="/" className="hover:text-brand-300">
            ← Back to the event website
          </Link>
        </p>
      </div>
    </main>
  );
}
