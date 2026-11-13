import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Briefcase, GraduationCap, HeartPulse } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { TRACKS } from "@/lib/constants";

const ICONS = {
  graduation: GraduationCap,
  brain: BrainCircuit,
  heart: HeartPulse,
  briefcase: Briefcase,
} as const;

export function Tracks() {
  return (
    <section id="tracks" className="section relative border-y border-white/[0.06] bg-ink-900/40">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">Four tracks</span>
          <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
            Pick the problem you want to <span className="text-gradient">solve</span>.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Each team registers under a single track. Your track is fixed at registration and shown
            on your team ID and receipt.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKS.map((track, i) => {
            const Icon = ICONS[track.icon];
            return (
              <Reveal key={track.id} delay={i * 70}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-850/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-glow">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-0"
                  />
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-300 ring-1 ring-brand-500/20">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-display text-[11px] font-bold tracking-[0.18em] text-white/15">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15.5px] font-semibold leading-snug text-white">
                    {track.name}
                  </h3>
                  <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-slate-400">
                    {track.description}
                  </p>
                  <Link
                    href={`/register?track=${track.id}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-300 transition-colors hover:text-brand-200"
                  >
                    Register in this track
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
