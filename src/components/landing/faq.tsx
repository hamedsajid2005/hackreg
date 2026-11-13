"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What team sizes are allowed?",
    a: "Teams must have 2, 3 or 4 members. The number of member forms on the registration page matches the team size you select, and the portal will not accept a submission where the member count and team size differ.",
  },
  {
    q: "What are the registration fees?",
    a: "The fee is charged once per team: ₹299 for 2 members, ₹499 for 3 members and ₹699 for 4 members. If the organiser enables taxes, the applicable tax is added and shown on the review screen before payment.",
  },
  {
    q: "How do I pay?",
    a: "Payment is handled by our payment gateway. You can pay with UPI (Google Pay, PhonePe, Paytm or any UPI app), a card, or netbanking. Where the gateway supports it, a dynamic UPI QR is generated for your exact order amount — that QR is single-use and tied to your order.",
  },
  {
    q: "When do I get my team ID?",
    a: "Your team ID (for example ZYL001) is generated only after the gateway confirms your payment to our server. It is permanent and cannot be changed. No team ID is issued for an unpaid registration.",
  },
  {
    q: "How do I know my registration is confirmed?",
    a: "Your confirmation page shows the verified registration details from our database, and a confirmation email with your team ID and PDF receipt is sent to the team leader's email address. You can also download the receipt from the confirmation page.",
  },
  {
    q: "My payment failed or the page closed. What now?",
    a: "Open the payment status link shown at checkout — it is unique to your registration. If the payment did not go through, you can generate a fresh payment order for the same registration. If money was debited but the payment is not confirmed, contact the organiser with your payment reference; we never mark a payment successful without the gateway's signed confirmation.",
  },
  {
    q: "Can I change my team details after paying?",
    a: "Team name, members and track are locked once payment is verified. If you need a correction, contact the organiser with your team ID and they can update it from the organizer dashboard.",
  },
  {
    q: "Can two teams from the same college register?",
    a: "Yes. Each team registers separately with its own team name and team leader email. The portal blocks a second registration using a team name or leader email that is already registered.",
  },
  {
    q: "What are the event dates, venue and prizes?",
    a: "These are published by the organiser in the event information section of this site as soon as they are finalised. We do not display dates, venues or prize details that have not been officially confirmed.",
  },
];

export function Faq() {
  return (
    <section id="faqs" className="section relative">
      <div className="container-page grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <span className="eyebrow">FAQs</span>
          <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,2.9rem)] font-bold leading-[1.08]">
            Questions, <span className="text-gradient">answered</span>.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-400">
            If something here does not cover your case, reach out to the organiser using the contact
            details below.
          </p>
        </div>

        <Accordion.Root type="single" collapsible className="divide-y divide-white/[0.08]">
          {FAQS.map((item, i) => (
            <Accordion.Item key={item.q} value={`item-${i}`} className="group">
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-left text-[14.5px] font-medium text-slate-100 transition-colors hover:text-white">
                  {item.q}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-brand-400"
                    aria-hidden
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden pb-5 text-[13.5px] leading-relaxed text-slate-400 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                {item.a}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
