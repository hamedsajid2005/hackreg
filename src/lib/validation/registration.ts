import { z } from "zod";
import { INDIAN_STATES, MEMBER_ROLES, TEAM_SIZES, TRACK_IDS } from "../constants";

const nameRegex = /^[A-Za-z][A-Za-z .'\-]*$/;
const teamNameRegex = /^[A-Za-z0-9][A-Za-z0-9 ._&'()\-]*$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, "").replace(/^(\+91|91)(?=\d{10}$)/, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), {
    message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9",
  });

export const memberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "Enter the member's full name")
    .max(80, "Name is too long")
    .regex(nameRegex, "Use letters, spaces, hyphens or apostrophes only"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Email is required")
    .max(160, "Email is too long")
    .email("Enter a valid email address"),
  phone: phoneSchema,
  college: z.string().trim().min(2, "College / organisation is required").max(140),
  role: z.enum(MEMBER_ROLES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Select a team role" }),
  }),
});

export const teamStepSchema = z.object({
  team_name: z
    .string()
    .trim()
    .min(3, "Team name must be at least 3 characters")
    .max(60, "Team name must be 60 characters or fewer")
    .regex(teamNameRegex, "Use letters, numbers, spaces and . _ & ' ( ) - only")
    .refine((v) => /[A-Za-z]/.test(v), "Team name must contain at least one letter"),
  team_size: z.coerce
    .number()
    .refine((v) => (TEAM_SIZES as readonly number[]).includes(v), "Choose a team size of 2, 3 or 4"),
  college: z.string().trim().min(2, "College / organisation is required").max(140),
  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(80)
    .regex(/^[A-Za-z][A-Za-z .'\-]*$/, "Use letters only"),
  state: z.enum(INDIAN_STATES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Select your state" }),
  }),
  track: z.enum(TRACK_IDS, { errorMap: () => ({ message: "Select a track" }) }),
});

export const registrationSchema = teamStepSchema.extend({
  members: z.array(memberSchema).min(2).max(4),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type TeamStepInput = z.infer<typeof teamStepSchema>;
export type MemberInput = z.infer<typeof memberSchema>;

/**
 * Cross-field rules that a plain zod object cannot express:
 *  - member count must equal the declared team size
 *  - no duplicate emails (or phones) inside a team
 *  - the leader's details drive the primary contact
 */
export function refineRegistration(input: RegistrationInput): string[] {
  const errors: string[] = [];
  if (input.members.length !== input.team_size) {
    errors.push(`Team size is ${input.team_size} but ${input.members.length} member(s) were submitted.`);
  }
  const emails = input.members.map((m) => m.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    errors.push("Each team member must use a different email address.");
  }
  const phones = input.members.map((m) => m.phone);
  if (new Set(phones).size !== phones.length) {
    errors.push("Each team member must use a different mobile number.");
  }
  if (input.members.some((m) => !m.full_name || !m.email)) {
    errors.push("Member records cannot be empty.");
  }
  return errors;
}
