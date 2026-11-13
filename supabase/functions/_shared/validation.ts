import { z } from "npm:zod@3.23.8";
import { HttpError } from "./http.ts";

/**
 * Server-side validation. Deliberately duplicated from src/lib/validation so an
 * Edge Function never depends on the Next.js bundle; the database constraints in
 * the migration are the final backstop.
 */

const nameRegex = /^[A-Za-z][A-Za-z .'\-]*$/;
const teamNameRegex = /^[A-Za-z0-9][A-Za-z0-9 ._&'()\-]*$/;

export const MEMBER_ROLES = [
  "Team Leader",
  "Full-Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI / ML Engineer",
  "UI / UX Designer",
  "Data Analyst",
  "Presenter / Researcher",
  "Other",
] as const;

export const memberSchema = z.object({
  full_name: z.string().trim().min(3).max(80).regex(nameRegex),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s\-()]/g, "").replace(/^(\+91|91)(?=\d{10}$)/, ""))
    .refine((v) => /^[6-9]\d{9}$/.test(v), { message: "Invalid Indian mobile number" }),
  college: z.string().trim().min(2).max(140),
  role: z.string().trim().min(2).max(60),
});

export const payloadSchema = z.object({
  team_name: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(teamNameRegex)
    .refine((v) => /[A-Za-z]/.test(v)),
  team_size: z.number().int().min(2).max(4),
  college: z.string().trim().min(2).max(140),
  city: z.string().trim().min(2).max(80).regex(nameRegex),
  state: z.string().trim().min(2).max(80),
  track: z.enum(["education", "ai", "healthcare", "business"]),
  members: z.array(memberSchema).min(2).max(4),
});

export type ValidatedPayload = z.infer<typeof payloadSchema>;

export function parsePayload(raw: unknown): ValidatedPayload {
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new HttpError(
      "validation_failed",
      `${first.path.join(".") || "payload"}: ${first.message}`,
      422,
    );
  }
  const data = parsed.data;

  if (data.members.length !== data.team_size) {
    throw new HttpError(
      "member_count_mismatch",
      `Team size is ${data.team_size} but ${data.members.length} members were submitted.`,
      422,
    );
  }
  const emails = data.members.map((m) => m.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    throw new HttpError("duplicate_member_email", "Each member needs a unique email.", 422);
  }
  const phones = data.members.map((m) => m.phone);
  if (new Set(phones).size !== phones.length) {
    throw new HttpError("duplicate_member_phone", "Each member needs a unique mobile number.", 422);
  }

  // Member 1 is always the leader — normalise so the stored role can never drift.
  data.members[0].role = "Team Leader";
  return data;
}
