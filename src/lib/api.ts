"use client";

import { publicEnv } from "./config";

/**
 * Thin client for the registration Edge Functions.
 * Only the publishable anon key is used here; every privileged decision
 * (pricing, order creation, payment confirmation, team ID) happens server-side.
 */

export type MemberPayload = {
  full_name: string;
  email: string;
  phone: string;
  college: string;
  role: string;
};

export type RegistrationPayload = {
  team_name: string;
  team_size: number;
  college: string;
  city: string;
  state: string;
  track: string;
  members: MemberPayload[];
};

export type PaymentOrder = {
  access_token: string;
  registration_id: string;
  provider: "razorpay" | "icici";
  amount_paise: number;
  currency: string;
  order: {
    id: string;
    key_id?: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    hosted_url?: string;
  };
  qr: { id: string; image_url: string | null; expires_at: string | null } | null;
  checkout_mode: "razorpay_checkout" | "hosted_redirect" | "qr_only";
};

export type PaymentStatusResult = {
  registration_status: "pending_payment" | "confirmed" | "cancelled";
  payment_status: "pending" | "successful" | "failed" | "cancelled" | "expired" | null;
  team_id: string | null;
  amount_paise: number;
  currency: string;
  expires_at: string | null;
  qr_image_url: string | null;
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiError("Registration service is not configured.", "not_configured", 500);
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok || json?.error) {
    throw new ApiError(
      json?.error?.message ?? json?.message ?? "Something went wrong. Please try again.",
      json?.error?.code ?? "request_failed",
      res.status,
    );
  }
  return json as T;
}

export function createRegistrationOrder(payload: RegistrationPayload) {
  return invoke<PaymentOrder>("create-registration", payload);
}

export function getPaymentStatus(accessToken: string) {
  return invoke<PaymentStatusResult>("payment-status", { access_token: accessToken });
}

export function createRetryOrder(accessToken: string) {
  return invoke<PaymentOrder>("create-registration", { retry_for: accessToken });
}

export function requestReceiptLink(accessToken: string) {
  return invoke<{ url: string; expires_in: number }>("registration-receipt", {
    access_token: accessToken,
  });
}

export async function fetchPublicRegistration(accessToken: string) {
  return invoke<{
    registration: {
      team_id: string | null;
      team_name: string;
      team_size: number;
      track: string;
      college: string;
      city: string;
      state: string;
      status: string;
      amount_paise: number;
      currency: string;
      leader_name: string;
      leader_email: string;
      confirmed_at: string | null;
      created_at: string;
      payment_status: string | null;
      payment_reference: string | null;
      provider: string | null;
      members: { full_name: string; role: string; is_leader: boolean }[];
    };
  }>("registration-details", { access_token: accessToken });
}

/** Loads the Razorpay checkout script once. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "1";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
