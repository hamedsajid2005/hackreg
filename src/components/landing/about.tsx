import { Compass, Gauge, Handshake, Rocket } from "lucide-react";
import { Reveal } from "@/components/reveal";

const PILLARS = [
  {
    icon: Rocket,
    title: "Ship something real",
    body: "Every track is judged on a working build, not a slide deck. You leave with a demo you can show anyone.",
  },
  {
    icon: Handshake,
    title: "Find your people",
    body: "Register as a team of two to four. Mix engineers, designers and storytellers — the strongest builds are cross-disciplinary.",
  },
  {
    icon: Gauge,
    title: "Work against the clock",
    body: "A focused sprint with checkpoints, mentor reviews and a final demo round in front of the Zelvora panel.",
  },
  {
    icon: Compass,
    title: "Solve for India first",
    body: "Tracks are chosen around problems that matter here — learning, health access, small business and applied AI.",
  },
];

export function About() {
  return (
    <section id="about" className="section relative">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <span className="eyebrow">About the hackathon</span>
            <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
              A hackathon built for teams that want to{" "}
              <span className="text-gradient">actually build</span>.
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-400">
              <p>
                ZELVORA REGISTRATION PORTAL is organised by Zelvora Technologies Pvt. Ltd. as a focused build sprint
                for students and early-career builders. The premise is simple: pick a problem that
                matters, form a small team, and spend the event turning an idea into a working
                prototype.
              </p>
              <p>
                There is no entry barrier beyond a registration fee and a genuine idea. Teams of two
                to four register under one of four tracks, receive a permanent team ID after payment,
                and build with access to mentors from the Zelvora engineering team.
              </p>
              <p>
                Registration is completed entirely online: submit your team and member details,
                pay securely through the payment gateway, and your team ID, receipt and confirmation
                email are issued the moment your payment is verified.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <div className="surface surface-hover h-full p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20">
                    <p.icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
