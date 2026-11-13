import type { PaymentStatus, RegistrationStatus, TeamSize, TrackId } from "./constants";

export type EventSettings = {
  id: string;
  event_name: string;
  organiser_name: string;
  tagline: string;
  registrations_open: boolean;
  registration_deadline: string | null;
  event_start: string | null;
  event_end: string | null;
  venue: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  announcement: string | null;
  tax_percent: number;
  tax_label: string | null;
  currency: string;
  fee_2_members_paise: number;
  fee_3_members_paise: number;
  fee_4_members_paise: number;
  payment_provider: string;
  updated_at: string | null;
};

export type RegistrationMember = {
  id: string;
  registration_id: string;
  position: number;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  role: string;
  is_leader: boolean;
};

export type Registration = {
  id: string;
  team_id: string | null;
  team_name: string;
  team_size: TeamSize;
  college: string;
  city: string;
  state: string;
  track: TrackId;
  status: RegistrationStatus;
  access_token: string;
  amount_paise: number;
  currency: string;
  leader_name: string;
  leader_email: string;
  leader_phone: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  payment_expires_at: string | null;
  registration_members?: RegistrationMember[];
  registration_payments?: RegistrationPayment[];
};

export type RegistrationPayment = {
  id: string;
  registration_id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  qr_code_id: string | null;
  qr_image_url: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  expires_at: string | null;
};

export type RegistrationEmail = {
  id: string;
  registration_id: string;
  recipient: string;
  template: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
};

export type DashboardStats = {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  failedPayments: number;
  totalParticipants: number;
  confirmedRevenuePaise: number;
  byTeamSize: { size: number; count: number }[];
  byTrack: { track: string; count: number }[];
};

/** Public-safe projection returned to a participant holding the secret token. */
export type PublicRegistration = {
  team_id: string;
  team_name: string;
  team_size: number;
  track: string;
  college: string;
  city: string;
  state: string;
  status: RegistrationStatus;
  amount_paise: number;
  currency: string;
  leader_name: string;
  leader_email: string;
  confirmed_at: string | null;
  created_at: string;
  payment_status: PaymentStatus | null;
  payment_reference: string | null;
  provider: string | null;
  members: { full_name: string; role: string; is_leader: boolean }[];
};
