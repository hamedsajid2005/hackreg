import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { calculateFee, isRegistrationWindowOpen } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";
import type { EventSettings } from "@/lib/types";

const INCLUDES = [
  "Team ID and confirmed registration",
  "PDF receipt issued after verified payment",
  "Access to mentors and build checkpoints",
  "Eligibility for demo day and judging",
];

export function Pricing({ settings }: { settings: EventSettings }) {
  const open = isRegistrationWindowOpen(settings);

  return (
    <section id="pricing" className="section relative border-y border-white/[0.06] bg-ink-900/40">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Registration fees</span>
          <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
            One fee per team, <span className="text-gradient">not per member</span>.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Pick your team size — the amount updates automatically. Fees shown are final for the
            selected size.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[2, 3, 4].map((size, i) => {
            const fee = calculateFee(size, settings);
            const popular = size === 3;
            return (
              <Reveal key={size} delay={i * 80}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300",
                    popular
                      ? "border-brand-500/45 bg-brand-soft shadow-glow"
                      : "border-white/10 bg-ink-850/60 hover:border-white/20",
                  )}
                >
                  {popular ? (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-950">
                      <Sparkles className="h-3 w-3" /> Most teams pick this
                    </span>
                  ) : null}

                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {size} members
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="font-display text-[2.6rem] font-extrabold leading-none text-white">
                      {formatINR(fee.basePaise)}
                    </span>
                    <span className="pb-1 text-[12.5px] text-slate-500">/ team</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-slate-500">
                    ≈ {formatINR(Math.round(fee.basePaise / size))} per member
                  </p>

                  {fee.taxPaise > 0 ? (
                    <p className="mt-2 text-[12px] text-slate-400">
                      + {fee.taxPercent}% {fee.taxLabel ?? "tax"} = {formatINR(fee.totalPaise)}
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] text-slate-500">No additional taxes configured</p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {INCLUDES.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild={open}
                    variant={popular ? "primary" : "secondary"}
                    size="lg"
                    className="mt-7 w-full"
                    disabled={!open}
                  >
                    {open ? (
                      <Link href={`/register?size=${size}`}>Register {size} members</Link>
                    ) : (
                      <span>Registrations closed</span>
                    )}
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[12.5px] text-slate-500">
          Fees are set by the organiser and may change before you register. The amount you pay is
          recalculated on our server at checkout.
        </p>
      </div>
    </section>
  );
}
