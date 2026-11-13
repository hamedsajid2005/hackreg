import { CreditCard, FileCheck2, IdCard, Rocket, UserPlus } from "lucide-react";
import { Reveal } from "@/components/reveal";

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your team",
    body: "Choose a team name, your team size (2, 3 or 4) and the track you want to build in.",
  },
  {
    icon: IdCard,
    title: "Enter member details",
    body: "Add every member's name, email, mobile number, college and role. One member is the team leader.",
  },
  {
    icon: CreditCard,
    title: "Complete payment",
    body: "Pay the registration fee securely by UPI, card or netbanking. The amount is calculated by our server.",
  },
  {
    icon: FileCheck2,
    title: "Receive your team ID",
    body: "Once the payment is verified, your permanent team ID, PDF receipt and confirmation email are issued.",
  },
  {
    icon: Rocket,
    title: "Get ready for Zelvora Registration Portal",
    body: "Watch your inbox for the build schedule, mentor slots and demo-day instructions from the organiser.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section relative">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
            From idea to team ID in <span className="text-gradient">five steps</span>.
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 60} className="relative">
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient font-display text-[13px] font-bold text-ink-950">
                    {i + 1}
                  </span>
                  <step.icon className="h-4 w-4 text-brand-300/80" aria-hidden />
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
