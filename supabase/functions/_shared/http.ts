/** Shared HTTP helpers for every Zelvation Edge Function. */

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export class HttpError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Safe, non-leaking error envelope. Internal details are never returned. */
export function fail(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }
  console.error("[zelvation] unhandled", error instanceof Error ? error.message : error);
  return json(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    500,
  );
}

export function requireMethod(req: Request, method = "POST") {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== method) {
    throw new HttpError("method_not_allowed", "Method not allowed.", 405);
  }
  return null;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(
      "not_configured",
      `Payment/email service is not configured (${name}).`,
      503,
    );
  }
  return value;
}
