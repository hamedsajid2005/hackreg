"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/card";
import {
  ApiError,
  createRegistrationOrder,
  createRetryOrder,
  getPaymentStatus,
  loadRazorpayScript,
  type PaymentOrder,
  type RegistrationPayload,
} from "@/lib/api";
import { INDIAN_STATES, MEMBER_ROLES, TEAM_SIZES, TRACKS } from "@/lib/constants";
import { calculateFee, isRegistrationWindowOpen } from "@/lib/pricing";
import { refineRegistration, registrationSchema } from "@/lib/validation/registration";
import { cn, formatINR } from "@/lib/utils";
import type { EventSettings } from "@/lib/types";

type MemberForm = {
  full_name: string;
  email: string;
  phone: string;
  college: string;
  role: string;
};

type FormState = {
  team_name: string;
  team_size: number;
  college: string;
  city: string;
  state: string;
  track: string;
  members: MemberForm[];
};

const emptyMember = (role = "Team Member"): MemberForm => ({
  full_name: "",
  email: "",
  phone: "",
  college: "",
  role,
});

const STEPS = ["Team", "Members", "Review"] as const;

export function RegistrationWizard({
  settings,
  initialTrack,
  initialSize,
  resumeToken,
}: {
  settings: EventSettings;
  initialTrack?: string;
  initialSize?: number;
  /** Present when a participant returns to an existing pending registration. */
  resumeToken?: string;
}) {
  const router = useRouter();
  const open = isRegistrationWindowOpen(settings);

  const [step, setStep] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [order, setOrder] = React.useState<PaymentOrder | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [resuming, setResuming] = React.useState(Boolean(resumeToken));

  // Returning from a pending registration: issue a fresh, safe order for the
  // SAME registration rather than creating a duplicate team entry.
  React.useEffect(() => {
    if (!resumeToken) return;
    let cancelled = false;
    (async () => {
      try {
        const fresh = await createRetryOrder(resumeToken);
        if (!cancelled) setOrder(fresh);
      } catch (err) {
        if (!cancelled) toast.error((err as ApiError).message);
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeToken]);

  const initialTeamSize =
    initialSize && (TEAM_SIZES as readonly number[]).includes(initialSize) ? initialSize : 2;

  const [form, setForm] = React.useState<FormState>({
    team_name: "",
    team_size: initialTeamSize,
    college: "",
    city: "",
    state: "",
    track: initialTrack && TRACKS.some((t) => t.id === initialTrack) ? initialTrack : "",
    members: [
      { ...emptyMember("Team Leader"), college: "" },
      { ...emptyMember("Team Member"), college: "" },
    ],
  });

  const fee = calculateFee(form.team_size, settings);

  const setTeamSize = (size: number) => {
    setForm((prev) => {
      const members = [...prev.members];
      while (members.length < size) {
        members.push({ ...emptyMember(""), college: prev.college });
      }
      while (members.length > size) members.pop();
      // The first member is always the team leader.
      members[0] = { ...members[0], role: members[0].role || "Team Leader" };
      return { ...prev, team_size: size, members };
    });
    setErrors({});
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const updateMember = (index: number, key: keyof MemberForm, value: string) => {
    setForm((prev) => {
      const members = prev.members.map((m, i) => (i === index ? { ...m, [key]: value } : m));
      return { ...prev, members };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`members.${index}.${key}`];
      return next;
    });
  };

  const errorsFromIssues = (issues: { path: (string | number)[]; message: string }[]) => {
    const map: Record<string, string> = {};
    for (const issue of issues) {
      const key = issue.path.join(".");
      if (!map[key]) map[key] = issue.message;
    }
    return map;
  };

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      const parsed = registrationSchema.shape
        ? registrationSchema
            .pick({ team_name: true, team_size: true, college: true, city: true, state: true, track: true })
            .safeParse({
              team_name: form.team_name,
              team_size: form.team_size,
              college: form.college,
              city: form.city,
              state: form.state,
              track: form.track,
            })
        : null;
      if (parsed && !parsed.success) {
        setErrors(errorsFromIssues(parsed.error.issues));
        toast.error("Please fix the highlighted fields.");
        return false;
      }
      setErrors({});
      return true;
    }
    if (index === 1) {
      const parsed = registrationSchema.safeParse(form);
      if (!parsed.success) {
        const map = errorsFromIssues(parsed.error.issues);
        setErrors(map);
        toast.error("Please complete every member's details.");
        return false;
      }
      const crossErrors = refineRegistration(parsed.data);
      if (crossErrors.length) {
        setErrors({ members: crossErrors.join(" ") });
        toast.error(crossErrors[0]);
        return false;
      }
      setErrors({});
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!validateStep(0) || !validateStep(1)) {
      setStep(0);
      return;
    }
    if (!accepted) {
      toast.error("Please accept the terms and privacy policy to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: RegistrationPayload = {
        team_name: form.team_name.trim(),
        team_size: form.team_size,
        college: form.college.trim(),
        city: form.city.trim(),
        state: form.state,
        track: form.track,
        members: form.members.map((m, i) => ({
          full_name: m.full_name.trim(),
          email: m.email.trim().toLowerCase(),
          phone: m.phone.trim(),
          college: m.college.trim() || form.college.trim(),
          role: i === 0 ? "Team Leader" : m.role,
        })),
      };
      const result = await createRegistrationOrder(payload);
      setOrder(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "We could not start your payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-slate-500" />
        <h2 className="mt-4 text-xl font-semibold text-white">Registrations are closed</h2>
        <p className="mt-2 text-sm text-slate-400">
          The organiser has closed team registration for {settings.event_name}. Follow the
          announcement banner on the home page for updates.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <a href="/">Back to home</a>
        </Button>
      </div>
    );
  }

  if (resuming) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
        <p className="mt-4 text-[13.5px] text-slate-300">Restoring your pending registration…</p>
      </div>
    );
  }

  if (order) {
    return <PaymentStage order={order} onRestart={() => setOrder(null)} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Stepper current={step} />

      <div className="mt-8 rounded-2xl border border-white/10 bg-ink-900/60 p-5 shadow-card sm:p-8">
        {step === 0 ? (
          <section aria-labelledby="step-team">
            <h2 id="step-team" className="text-lg font-semibold text-white">
              Team information
            </h2>
            <p className="mt-1 text-[13px] text-slate-400">
              This is how your team appears on the confirmation, receipt and team ID.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="team_name" required>
                  Team name
                </Label>
                <Input
                  id="team_name"
                  value={form.team_name}
                  onChange={(e) => updateField("team_name", e.target.value)}
                  placeholder="e.g. Byte Brigade"
                  maxLength={60}
                  aria-invalid={Boolean(errors.team_name)}
                />
                <FieldError message={errors.team_name} />
              </div>

              <div className="sm:col-span-2">
                <Label required>Team size</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {TEAM_SIZES.map((size) => {
                    const f = calculateFee(size, settings);
                    const active = form.team_size === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTeamSize(size)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-all",
                          active
                            ? "border-brand-500/60 bg-brand-500/10 shadow-glow"
                            : "border-white/10 bg-white/[0.02] hover:border-white/25",
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-white">{size} members</span>
                          {active ? <Check className="h-3.5 w-3.5 text-brand-400" /> : null}
                        </span>
                        <span className="mt-1 block text-[12px] text-slate-400">
                          {formatINR(f.totalPaise)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.team_size} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="college" required>
                  College / organisation
                </Label>
                <Input
                  id="college"
                  value={form.college}
                  onChange={(e) => updateField("college", e.target.value)}
                  placeholder="Institution or company name"
                  maxLength={140}
                  aria-invalid={Boolean(errors.college)}
                />
                <FieldError message={errors.college} />
              </div>

              <div>
                <Label htmlFor="city" required>
                  City
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Hyderabad"
                  maxLength={80}
                  aria-invalid={Boolean(errors.city)}
                />
                <FieldError message={errors.city} />
              </div>

              <div>
                <Label htmlFor="state" required>
                  State
                </Label>
                <Select
                  id="state"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  aria-invalid={Boolean(errors.state)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.state} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="track" required>
                  Selected track
                </Label>
                <Select
                  id="track"
                  value={form.track}
                  onChange={(e) => updateField("track", e.target.value)}
                  aria-invalid={Boolean(errors.track)}
                >
                  <option value="">Select a track</option>
                  {TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.track} />
              </div>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section aria-labelledby="step-members">
            <h2 id="step-members" className="text-lg font-semibold text-white">
              Member information
            </h2>
            <p className="mt-1 text-[13px] text-slate-400">
              {form.team_size} members required. Member 1 is the team leader and receives all
              communication.
            </p>

            {errors.members ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errors.members}</span>
              </div>
            ) : null}

            <div className="mt-6 space-y-5">
              {form.members.map((member, index) => {
                const isLeader = index === 0;
                return (
                  <fieldset
                    key={index}
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5",
                      isLeader
                        ? "border-brand-500/30 bg-brand-500/[0.05]"
                        : "border-white/10 bg-white/[0.02]",
                    )}
                  >
                    <legend className="flex items-center gap-2 px-1">
                      <span className="font-display text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Member {index + 1}
                      </span>
                      {isLeader ? (
                        <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-ink-950">
                          Team Leader
                        </span>
                      ) : null}
                    </legend>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor={`m${index}-name`} required>
                          Full name
                        </Label>
                        <Input
                          id={`m${index}-name`}
                          value={member.full_name}
                          onChange={(e) => updateMember(index, "full_name", e.target.value)}
                          placeholder="As per college ID"
                          maxLength={80}
                          autoComplete="name"
                          aria-invalid={Boolean(errors[`members.${index}.full_name`])}
                        />
                        <FieldError message={errors[`members.${index}.full_name`]} />
                      </div>

                      <div>
                        <Label htmlFor={`m${index}-email`} required>
                          Email address
                        </Label>
                        <Input
                          id={`m${index}-email`}
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(index, "email", e.target.value)}
                          placeholder="name@example.com"
                          maxLength={160}
                          autoComplete="email"
                          aria-invalid={Boolean(errors[`members.${index}.email`])}
                        />
                        <FieldError message={errors[`members.${index}.email`]} />
                      </div>

                      <div>
                        <Label htmlFor={`m${index}-phone`} required>
                          Mobile number
                        </Label>
                        <div className="flex">
                          <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-white/12 bg-white/[0.04] px-3 text-[13px] text-slate-400">
                            +91
                          </span>
                          <Input
                            id={`m${index}-phone`}
                            type="tel"
                            inputMode="numeric"
                            value={member.phone}
                            onChange={(e) => updateMember(index, "phone", e.target.value)}
                            placeholder="10-digit number"
                            maxLength={14}
                            autoComplete="tel-national"
                            className="rounded-l-none"
                            aria-invalid={Boolean(errors[`members.${index}.phone`])}
                          />
                        </div>
                        <FieldError message={errors[`members.${index}.phone`]} />
                      </div>

                      <div>
                        <Label htmlFor={`m${index}-college`} required>
                          College / organisation
                        </Label>
                        <Input
                          id={`m${index}-college`}
                          value={member.college}
                          onChange={(e) => updateMember(index, "college", e.target.value)}
                          placeholder={form.college || "Institution name"}
                          maxLength={140}
                          aria-invalid={Boolean(errors[`members.${index}.college`])}
                        />
                        <FieldError message={errors[`members.${index}.college`]} />
                      </div>

                      <div>
                        <Label htmlFor={`m${index}-role`} required>
                          Team role
                        </Label>
                        {isLeader ? (
                          <Input id={`m${index}-role`} value="Team Leader" readOnly disabled />
                        ) : (
                          <Select
                            id={`m${index}-role`}
                            value={member.role}
                            onChange={(e) => updateMember(index, "role", e.target.value)}
                            aria-invalid={Boolean(errors[`members.${index}.role`])}
                          >
                            <option value="">Select role</option>
                            {MEMBER_ROLES.filter((r) => r !== "Team Leader").map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        )}
                        <FieldError message={errors[`members.${index}.role`]} />
                      </div>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <ReviewStep form={form} settings={settings} fee={fee} errors={errors} />
        ) : null}

        <Separator className="my-7" />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 0 ? (
              <Button variant="ghost" onClick={goBack} type="button">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <Lock className="h-3.5 w-3.5" /> Details are validated on our server before payment
              </p>
            )}
          </div>

          {step < 2 ? (
            <Button onClick={goNext} size="lg" type="button">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-full sm:w-auto">
              <label className="mb-3 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-slate-400">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-brand-500"
                />
                <span>
                  I confirm the details above are correct and accept the{" "}
                  <a href="/terms" target="_blank" className="text-brand-300 underline-offset-2 hover:underline">
                    terms &amp; conditions
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-brand-300 underline-offset-2 hover:underline">
                    privacy policy
                  </a>
                  .
                </span>
              </label>
              <Button
                onClick={submit}
                size="lg"
                disabled={submitting}
                className="w-full sm:w-auto"
                type="button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating secure order…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Pay {formatINR(fee.totalPaise)} securely
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Registration progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold transition-colors",
                done && "bg-brand-gradient text-ink-950",
                active && "border-2 border-brand-400 text-brand-300",
                !done && !active && "border border-white/15 text-slate-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[12.5px] font-medium",
                active ? "text-white" : done ? "text-slate-300" : "text-slate-500",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="h-px flex-1 bg-white/10" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewStep({
  form,
  settings,
  fee,
  errors,
}: {
  form: FormState;
  settings: EventSettings;
  fee: ReturnType<typeof calculateFee>;
  errors: Record<string, string>;
}) {
  const track = TRACKS.find((t) => t.id === form.track);
  return (
    <section aria-labelledby="step-review">
      <h2 id="step-review" className="text-lg font-semibold text-white">
        Review your registration
      </h2>
      <p className="mt-1 text-[13px] text-slate-400">
        Check everything before paying. Use Back to correct any detail.
      </p>

      {Object.keys(errors).length ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Some details still need attention. Go back and fix the highlighted fields.</span>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Team
            </h3>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              <Row label="Team name" value={form.team_name || "—"} />
              <Row label="Team size" value={`${form.team_size} members`} />
              <Row label="College" value={form.college || "—"} />
              <Row label="City / State" value={`${form.city || "—"}, ${form.state || "—"}`} />
              <Row label="Track" value={track?.name ?? "—"} />
            </dl>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Members
            </h3>
            <ul className="mt-3 space-y-3">
              {form.members.map((m, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <p className="font-medium text-white">
                      {m.full_name || "—"}
                      {i === 0 ? (
                        <span className="ml-2 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-brand-300">
                          Leader
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {m.email || "—"} · {m.phone ? `+91 ${m.phone}` : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-[11.5px] text-slate-400">
                    {i === 0 ? "Team Leader" : m.role || "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-brand-500/25 bg-brand-soft p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200/80">
            Amount payable
          </h3>
          <dl className="mt-4 space-y-2.5 text-[13.5px]">
            <Row label={`${form.team_size} members`} value={`${form.team_size} × registration`} muted />
            <Row label="Base registration fee" value={formatINR(fee.basePaise)} />
            {fee.taxPaise > 0 ? (
              <Row
                label={`${fee.taxLabel ?? "Tax"} (${fee.taxPercent}%)`}
                value={formatINR(fee.taxPaise)}
              />
            ) : (
              <Row label="Taxes" value="Not applicable" muted />
            )}
            <Separator className="!bg-white/15" />
            <div className="flex items-center justify-between pt-1">
              <dt className="text-[13px] font-medium text-white">Total payable</dt>
              <dd className="font-display text-xl font-bold text-white">
                {formatINR(fee.totalPaise)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-brand-100/70">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The amount is recalculated by our server before the payment order is created.
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className={cn("text-slate-500", muted && "text-slate-500/80")}>{label}</dt>
      <dd className={cn("text-right font-medium", muted ? "text-slate-400" : "text-slate-100")}>
        {value}
      </dd>
    </div>
  );
}

function PaymentStage({ order, onRestart }: { order: PaymentOrder; onRestart: () => void }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<string>("pending");
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState<PaymentOrder>(order);
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);

  const confirmationUrl = `/confirmation/${current.access_token}`;

  // Poll the server-verified status. A redirect from the gateway is never
  // treated as proof of payment — only the webhook-confirmed row is.
  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getPaymentStatus(current.access_token);
        if (cancelled) return;
        setStatus(res.payment_status ?? "pending");
        if (res.registration_status === "confirmed" && res.team_id) {
          router.push(`${confirmationUrl}?verified=1`);
        }
      } catch {
        /* keep polling silently */
      }
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [current.access_token, confirmationUrl, router]);

  const qrExpiry = current.qr?.expires_at ?? null;

  React.useEffect(() => {
    if (!qrExpiry) return;
    const update = () => {
      const ms = new Date(qrExpiry).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.round(ms / 1000)));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [qrExpiry]);

  const openCheckout = async () => {
    if (current.checkout_mode === "hosted_redirect" && current.order.hosted_url) {
      window.location.href = current.order.hosted_url;
      return;
    }
    setBusy(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Checkout script could not be loaded. Check your connection.");
      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: current.order.key_id,
        order_id: current.order.id,
        amount: current.order.amount,
        currency: current.order.currency,
        name: current.order.name ?? "ZELVORA REGISTRATION PORTAL",
        description: current.order.description ?? "Team registration",
        theme: { color: "#06F4ED" },
        handler: () => {
          router.push(`${confirmationUrl}?verifying=1`);
        },
        modal: {
          ondismiss: () => toast.info("Payment window closed. Your order is still pending."),
        },
      });
      rzp.on("payment.failed", () => {
        toast.error("The payment did not go through. You can retry safely.");
      });
      rzp.open();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      const fresh = await createRetryOrder(current.access_token);
      setCurrent(fresh);
      setStatus("pending");
      toast.success("A fresh payment order has been created for this registration.");
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">
              <Clock className="h-3 w-3" /> Awaiting payment
            </span>
            <h2 className="mt-4 text-xl font-semibold text-white">Complete your payment</h2>
            <p className="mt-1.5 text-[13.5px] text-slate-400">
              Your registration is saved as pending. A team ID is issued only after the gateway
              confirms this payment to our server.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Amount</p>
            <p className="font-display text-2xl font-bold text-white">
              {formatINR(current.amount_paise)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="order-last rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Smartphone className="h-4 w-4 text-brand-400" /> Prefer the checkout page?
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
              Google Pay, PhonePe, Paytm, any UPI app, cards and netbanking are available on the
              secure checkout.
            </p>
            <Button onClick={openCheckout} disabled={busy} className="mt-4 w-full" size="lg">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Open secure checkout
            </Button>
          </div>

          <div className="order-first rounded-2xl border border-brand-500/30 bg-brand-500/[0.06] p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <QrCode className="h-4 w-4 text-brand-400" /> Scan this QR to pay
            </h3>
            <p className="mt-1 text-[11.5px] text-slate-400">
              Google Pay · PhonePe · Paytm · any UPI app
            </p>
            {current.qr?.image_url ? (
              <div className="mt-3 flex flex-col items-center">
                {/* Gateway-generated, single-use QR tied to this order — never a static UPI ID. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.qr.image_url}
                  alt="Dynamic UPI QR code for this payment order"
                  className="h-48 w-48 rounded-xl bg-white p-2"
                />
                <p className="mt-3 text-center text-[11.5px] text-slate-300">
                  Pay exactly {formatINR(current.amount_paise)}
                  {secondsLeft !== null
                    ? secondsLeft > 0
                      ? ` · expires in ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`
                      : " · QR expired"
                    : ""}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                A dynamic UPI QR is generated by the gateway for the exact amount of this order.
                If your merchant account does not have UPI QR enabled, use the checkout page —
                it accepts UPI apps, cards and netbanking.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[12.5px] text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
            Verifying with the gateway · status: {status}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={retry} disabled={busy}>
              <RefreshCw className="h-3.5 w-3.5" /> New order
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a href={confirmationUrl}>Check status</a>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-slate-500">
          Keep this page open — it checks the gateway every few seconds and updates the moment your
          payment is verified. A scan alone is never treated as payment; only a captured payment
          recorded by the gateway confirms your team. You can return later using your private
          confirmation link, but never share it.
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-4 text-[12px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          Edit my details instead
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" />
        Webhook-verified · idempotent processing · no card data stored
      </div>
    </div>
  );
}
