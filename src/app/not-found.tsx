import Link from "next/link";
import { ZelvoraLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <ZelvoraLogo size={96} rounded="rounded-2xl" />
      <p className="mt-8 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-300">
        404
      </p>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">This page could not be found</h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-400">
        If you were looking for a registration confirmation, the link may be incomplete. Use the
        private link from your confirmation email, or start a new registration.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/register">Register a team</Link>
        </Button>
      </div>
    </main>
  );
}
