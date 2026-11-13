import { admin } from "../_shared/db.ts";
import { HttpError, fail, json, requireMethod } from "../_shared/http.ts";
import { buildReceiptData, generateAndStoreReceipt } from "../_shared/receipt.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * registration-receipt
 * Regenerates the PDF if it is missing and returns a short-lived signed URL.
 * Accessible only with the registration's secret access token; the storage
 * bucket itself stays private.
 */
Deno.serve(async (req) => {
  const preflight = requireMethod(req, "POST");
  if (preflight) return preflight;

  try {
    const { access_token } = await req.json().catch(() => ({ access_token: null }));
    if (typeof access_token !== "string" || !UUID_RE.test(access_token)) {
      throw new HttpError("invalid_token", "A valid access token is required.", 400);
    }

    const { data: registration, error } = await admin()
      .from("registrations")
      .select("id, status, team_id")
      .eq("access_token", access_token)
      .maybeSingle();

    if (error || !registration) throw new HttpError("not_found", "Registration not found.", 404);
    if (registration.status !== "confirmed" || !registration.team_id) {
      throw new HttpError(
        "not_confirmed",
        "A receipt is issued only after the payment is verified.",
        409,
      );
    }

    const receiptData = await buildReceiptData(registration.id);
    if (!receiptData) throw new HttpError("not_confirmed", "Receipt data unavailable.", 409);

    const path = await generateAndStoreReceipt(receiptData);

    const { data: signed, error: signError } = await admin()
      .storage.from("zelvation-receipts")
      .createSignedUrl(path, 300, {
        download: `${registration.team_id}-zelvation-receipt.pdf`,
      });

    if (signError || !signed?.signedUrl) {
      throw new HttpError("sign_failed", "Could not create a download link.", 500);
    }

    return json({ url: signed.signedUrl, expires_in: 300 });
  } catch (error) {
    return fail(error);
  }
});
