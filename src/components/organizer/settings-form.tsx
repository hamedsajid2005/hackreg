"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { updateEventSettings } from "@/app/organizer/actions";
import type { EventSettings } from "@/lib/types";

const schema = z.object({
  event_name: z.string().trim().min(2, "Required").max(60),
  organiser_name: z.string().trim().min(2, "Required").max(120),
  tagline: z.string().trim().max(120),
  registrations_open: z.boolean(),
  registration_deadline: z.string(),
  event_start: z.string(),
  event_end: z.string(),
  venue: z.string().trim().max(160),
  contact_email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  contact_phone: z.string().trim().max(24),
  contact_address: z.string().trim().max(240),
  announcement: z.string().trim().max(240),
  tax_percent: z.coerce.number().min(0).max(100),
  tax_label: z.string().trim().max(40),
  fee_2: z.coerce.number().min(0).max(100000),
  fee_3: z.coerce.number().min(0).max(100000),
  fee_4: z.coerce.number().min(0).max(100000),
  payment_provider: z.enum(["razorpay", "icici"]),
});

type FormValues = z.infer<typeof schema>;

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function SettingsForm({ settings }: { settings: EventSettings }) {
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      event_name: settings.event_name,
      organiser_name: settings.organiser_name,
      tagline: settings.tagline,
      registrations_open: settings.registrations_open,
      registration_deadline: toLocalInput(settings.registration_deadline),
      event_start: toLocalInput(settings.event_start),
      event_end: toLocalInput(settings.event_end),
      venue: settings.venue ?? "",
      contact_email: settings.contact_email ?? "",
      contact_phone: settings.contact_phone ?? "",
      contact_address: settings.contact_address ?? "",
      announcement: settings.announcement ?? "",
      tax_percent: Number(settings.tax_percent ?? 0),
      tax_label: settings.tax_label ?? "",
      fee_2: settings.fee_2_members_paise / 100,
      fee_3: settings.fee_3_members_paise / 100,
      fee_4: settings.fee_4_members_paise / 100,
      payment_provider: (settings.payment_provider as "razorpay" | "icici") ?? "razorpay",
    },
  });

  const open = watch("registrations_open");

  const onSubmit = async (values: FormValues) => {
    setPending(true);
    const result = await updateEventSettings({
      ...values,
      registration_deadline: values.registration_deadline ? new Date(values.registration_deadline).toISOString() : null,
      event_start: values.event_start ? new Date(values.event_start).toISOString() : null,
      event_end: values.event_end ? new Date(values.event_end).toISOString() : null,
      fee_2_members_paise: Math.round(values.fee_2 * 100),
      fee_3_members_paise: Math.round(values.fee_3 * 100),
      fee_4_members_paise: Math.round(values.fee_4 * 100),
    });
    setPending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Event identity
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Event name</Label>
            <Input {...register("event_name")} />
            <FieldError message={errors.event_name?.message} />
          </div>
          <div>
            <Label required>Organiser name</Label>
            <Input {...register("organiser_name")} />
            <FieldError message={errors.organiser_name?.message} />
          </div>
          <div className="sm:col-span-2">
            <Label>Tagline</Label>
            <Input {...register("tagline")} />
            <FieldError message={errors.tagline?.message} />
          </div>
          <div className="sm:col-span-2">
            <Label>Announcement banner</Label>
            <Textarea {...register("announcement")} placeholder="Shown at the top of the public site. Leave empty to hide." />
            <FieldError message={errors.announcement?.message} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Registration window
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Registrations</Label>
            <Select {...register("registrations_open", { setValueAs: (v) => v === "true" || v === true })}>
              <option value="true">Open — accepting teams</option>
              <option value="false">Closed — no new teams</option>
            </Select>
            <p className="mt-1.5 text-[11.5px] text-slate-500">
              Currently {open ? "open" : "closed"} on the public site.
            </p>
          </div>
          <div>
            <Label>Registration deadline</Label>
            <Input type="datetime-local" {...register("registration_deadline")} />
            <p className="mt-1.5 text-[11.5px] text-slate-500">
              Registrations close automatically at this time (Asia/Kolkata display).
            </p>
          </div>
          <div>
            <Label>Event start</Label>
            <Input type="datetime-local" {...register("event_start")} />
          </div>
          <div>
            <Label>Event end</Label>
            <Input type="datetime-local" {...register("event_end")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Venue</Label>
            <Input {...register("venue")} placeholder="Leave empty until the venue is confirmed" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Registration fees (₹ per team)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label required>2 members</Label>
            <Input type="number" step="1" min="0" {...register("fee_2")} />
            <FieldError message={errors.fee_2?.message} />
          </div>
          <div>
            <Label required>3 members</Label>
            <Input type="number" step="1" min="0" {...register("fee_3")} />
            <FieldError message={errors.fee_3?.message} />
          </div>
          <div>
            <Label required>4 members</Label>
            <Input type="number" step="1" min="0" {...register("fee_4")} />
            <FieldError message={errors.fee_4?.message} />
          </div>
          <div>
            <Label>Tax percentage</Label>
            <Input type="number" step="0.01" min="0" max="100" {...register("tax_percent")} />
            <p className="mt-1.5 text-[11.5px] text-slate-500">0 = no tax added.</p>
          </div>
          <div>
            <Label>Tax label</Label>
            <Input {...register("tax_label")} placeholder="e.g. GST" />
          </div>
          <div>
            <Label>Payment provider</Label>
            <Select {...register("payment_provider")}>
              <option value="razorpay">Razorpay</option>
              <option value="icici">ICICI Bank (awaiting merchant credentials)</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Contact details (published on the site)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Contact email</Label>
            <Input type="email" {...register("contact_email")} placeholder="Leave empty to hide" />
            <FieldError message={errors.contact_email?.message} />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input {...register("contact_phone")} placeholder="Leave empty to hide" />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Textarea {...register("contact_address")} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
        <p className="text-[11.5px] text-slate-500">
          {isDirty ? "Unsaved changes" : "All changes saved"} · every update is written to the audit log
        </p>
      </div>
    </form>
  );
}
